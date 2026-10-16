import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/components/LocaleProvider";
import { SettingsDialog } from "@/components/SettingsDialog";
import { WorkspaceState, useOptionalWorkspace } from "@/components/WorkspaceProvider";
import { SharedLinkPrompt } from "@/components/WorkspaceSharing";
import { WORKSPACE_STORAGE_KEY } from "@/lib/workspace";

const A = "11111111-1111-4111-8111-111111111111"; // this browser's workspace
const B = "22222222-2222-4222-8222-222222222222"; // another one that exists
const MISSING = "33333333-3333-4333-8333-333333333333";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** A fake backend where A and B exist and anything else is a 404. */
function fakeBackend({ down = false }: { down?: boolean } = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { pathname } = new URL(url);
    if (down && pathname !== "/workspaces") throw new TypeError("Failed to fetch");
    if (pathname === "/workspaces" && init?.method === "POST") return json({ id: A }, 201);
    const id = pathname.split("/workspaces/")[1];
    if ([A, B].includes(id)) return json({ id, daily_capacity_minutes: 240 });
    return json({ detail: "Workspace not found" }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Shows which workspace the app is on now. */
function CurrentId() {
  return <p data-testid="current">{useOptionalWorkspace() ?? "none"}</p>;
}

function renderApp() {
  render(
    <LocaleProvider>
      <WorkspaceState>
        <SettingsDialog />
        <SharedLinkPrompt />
        <CurrentId />
      </WorkspaceState>
    </LocaleProvider>,
  );
}

/** A user with a working (or refusing) clipboard. Set up before the clipboard is replaced. */
function setupUser(clipboard: "works" | "refuses" = "works") {
  const user = userEvent.setup();
  const writeText = vi.fn(async (text: string) => {
    if (clipboard === "refuses") throw new DOMException("denied", "NotAllowedError");
    void text;
  });
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return { user, writeText };
}

const current = () => screen.getByTestId("current");
const settings = () => screen.getByRole("dialog", { name: /Settings|Pengaturan/ });

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(current()).toHaveTextContent(A));
  await user.click(screen.getByRole("button", { name: /^(Settings|Pengaturan)$/ }));
  await screen.findByRole("textbox", { name: /Your workspace code|Kode ruang kerjamu/ });
}

describe("sharing a workspace between devices", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(WORKSPACE_STORAGE_KEY, A);
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => vi.unstubAllGlobals());

  describe("in Settings", () => {
    it("shows this workspace's code, read-only, with a privacy warning", async () => {
      fakeBackend();
      const { user } = setupUser();
      renderApp();
      await openSettings(user);

      const code = screen.getByRole("textbox", { name: "Your workspace code" });
      expect(code).toHaveValue(A);
      expect(code).toHaveAttribute("readonly");
      expect(settings()).toHaveTextContent("Anyone with this code can see and change your tasks");
    });

    it("copies a link that opens this workspace, and says so", async () => {
      fakeBackend();
      const { user, writeText } = setupUser();
      renderApp();
      await openSettings(user);

      await user.click(screen.getByRole("button", { name: "Copy link" }));

      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/#workspace=${A}`);
      const message = await within(settings()).findByText("Link copied.");
      expect(message).toHaveAttribute("role", "status"); // announced to screen readers
    });

    it("copies just the code", async () => {
      fakeBackend();
      const { user, writeText } = setupUser();
      renderApp();
      await openSettings(user);

      await user.click(screen.getByRole("button", { name: "Copy code" }));

      expect(writeText).toHaveBeenCalledWith(A);
      expect(within(settings()).getByText("Code copied.")).toBeInTheDocument();
    });

    it("explains how to copy by hand when the browser refuses", async () => {
      fakeBackend();
      const { user } = setupUser("refuses");
      renderApp();
      await openSettings(user);

      await user.click(screen.getByRole("button", { name: "Copy code" }));

      expect(await screen.findByText(/Couldn't copy automatically/)).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Your workspace code" })).toHaveValue(A); // still there to select
    });

    it("only enables Open once something is typed", async () => {
      fakeBackend();
      const { user } = setupUser();
      renderApp();
      await openSettings(user);

      expect(screen.getByRole("button", { name: "Open" })).toBeDisabled();
      await user.type(screen.getByRole("textbox", { name: "Open another workspace" }), "x");
      expect(screen.getByRole("button", { name: "Open" })).toBeEnabled();
    });

    it("rejects text that is not a code, without switching or asking", async () => {
      fakeBackend();
      const { user } = setupUser();
      renderApp();
      await openSettings(user);

      await user.type(screen.getByRole("textbox", { name: "Open another workspace" }), "hello there");
      await user.click(screen.getByRole("button", { name: "Open" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("doesn't look like a workspace code");
      expect(screen.queryByText("Open that workspace instead?")).not.toBeInTheDocument();
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(A);
    });

    it("says so when the code is this workspace's own", async () => {
      fakeBackend();
      const { user } = setupUser();
      renderApp();
      await openSettings(user);

      await user.type(screen.getByRole("textbox", { name: "Open another workspace" }), A.toUpperCase());
      await user.click(screen.getByRole("button", { name: "Open" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("already using");
      expect(screen.queryByText("Open that workspace instead?")).not.toBeInTheDocument();
    });

    it("asks before replacing the tasks, offering to copy the current code first", async () => {
      fakeBackend();
      const { user, writeText } = setupUser();
      renderApp();
      await openSettings(user);

      await user.type(screen.getByRole("textbox", { name: "Open another workspace" }), B);
      await user.click(screen.getByRole("button", { name: "Open" }));

      expect(await screen.findByText("Open that workspace instead?")).toBeInTheDocument();
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(A); // nothing changed yet
      await user.click(screen.getByRole("button", { name: "Copy my current code" }));
      expect(writeText).toHaveBeenCalledWith(A);
    });

    it("keeps everything as it was when the person chooses to keep their tasks", async () => {
      fakeBackend();
      const { user } = setupUser();
      renderApp();
      await openSettings(user);
      await user.type(screen.getByRole("textbox", { name: "Open another workspace" }), B);
      await user.click(screen.getByRole("button", { name: "Open" }));

      await user.click(await screen.findByRole("button", { name: "Keep my tasks" }));

      expect(screen.queryByText("Open that workspace instead?")).not.toBeInTheDocument();
      expect(current()).toHaveTextContent(A);
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(A);
    });

    it("switches to the other workspace when confirmed, and closes Settings", async () => {
      fakeBackend();
      const { user } = setupUser();
      renderApp();
      await openSettings(user);
      // a whole link works as well as a bare code
      await user.type(
        screen.getByRole("textbox", { name: "Open another workspace" }),
        `https://pikoplan.vercel.app/#workspace=${B}`,
      );
      await user.click(screen.getByRole("button", { name: "Open" }));

      await user.click(await screen.findByRole("button", { name: "Yes, open it" }));

      await waitFor(() => expect(current()).toHaveTextContent(B));
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(B);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("stays on the current workspace and says so when the code does not exist", async () => {
      fakeBackend();
      const { user } = setupUser();
      renderApp();
      await openSettings(user);
      await user.type(screen.getByRole("textbox", { name: "Open another workspace" }), MISSING);
      await user.click(screen.getByRole("button", { name: "Open" }));

      await user.click(await screen.findByRole("button", { name: "Yes, open it" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("couldn't find a workspace");
      expect(current()).toHaveTextContent(A);
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(A);
      expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument(); // still open
    });

    it("stays on the current workspace and says so when the server cannot be reached", async () => {
      const backend = fakeBackend();
      const { user } = setupUser();
      renderApp();
      await openSettings(user);
      await user.type(screen.getByRole("textbox", { name: "Open another workspace" }), B);
      await user.click(screen.getByRole("button", { name: "Open" }));
      const confirm = await screen.findByRole("button", { name: "Yes, open it" });
      backend.mockImplementation(async () => {
        throw new TypeError("Failed to fetch");
      });

      await user.click(confirm);

      expect(await screen.findByRole("alert")).toHaveTextContent("couldn't reach the server");
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(A);
    });

    it("is in Indonesian too", async () => {
      localStorage.setItem("orca.locale", "id");
      fakeBackend();
      const { user } = setupUser();
      renderApp();
      await openSettings(user);

      expect(screen.getByRole("textbox", { name: "Kode ruang kerjamu" })).toHaveValue(A);
      expect(screen.getByRole("button", { name: "Salin tautan" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Salin kode" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Buka" })).toBeInTheDocument();
      expect(settings()).toHaveTextContent("Siapa pun yang punya kode ini");
    });
  });

  describe("when a shared link is opened", () => {
    it("asks first if this browser already has its own tasks", async () => {
      fakeBackend();
      setupUser();
      window.history.replaceState(null, "", `/#workspace=${B}`);
      renderApp();

      const dialog = await screen.findByRole("dialog", { name: "This link opens a different workspace" });

      expect(dialog).toBeInTheDocument();
      expect(current()).toHaveTextContent(A); // not switched behind the person's back
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(A);
    });

    it("keeps the person's tasks and tidies the address bar when they decline", async () => {
      fakeBackend();
      const { user } = setupUser();
      window.history.replaceState(null, "", `/#workspace=${B}`);
      renderApp();

      await user.click(await screen.findByRole("button", { name: "Keep my tasks" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(window.location.hash).toBe("");
      expect(current()).toHaveTextContent(A);
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(A);
    });

    it("asks when a link is pasted into a tab that already has the app open", async () => {
      fakeBackend();
      setupUser();
      renderApp();
      await waitFor(() => expect(current()).toHaveTextContent(A));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Only the part after "#" changes, so this is not a page load: the browser fires hashchange.
      window.history.replaceState(null, "", `/#workspace=${B}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));

      expect(await screen.findByRole("dialog", { name: "This link opens a different workspace" })).toBeInTheDocument();
      expect(current()).toHaveTextContent(A);
    });

    it("does not ask on its own for a workspace link that is for the one already in use", async () => {
      fakeBackend();
      setupUser();
      renderApp();
      await waitFor(() => expect(current()).toHaveTextContent(A));

      window.history.replaceState(null, "", `/#workspace=${A}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));

      await waitFor(() => expect(window.location.hash).toBe(""));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("switches when they accept", async () => {
      fakeBackend();
      const { user } = setupUser();
      window.history.replaceState(null, "", `/#workspace=${B}`);
      renderApp();

      await user.click(await screen.findByRole("button", { name: "Yes, open it" }));

      await waitFor(() => expect(current()).toHaveTextContent(B));
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(B);
      expect(window.location.hash).toBe("");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does not ask when the link is for the workspace already in use", async () => {
      fakeBackend();
      setupUser();
      window.history.replaceState(null, "", `/#workspace=${A}`);
      renderApp();

      await waitFor(() => expect(current()).toHaveTextContent(A));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await waitFor(() => expect(window.location.hash).toBe(""));
    });

    it("does not ask on a browser with no workspace yet: it just opens the linked one", async () => {
      localStorage.clear();
      fakeBackend();
      setupUser();
      window.history.replaceState(null, "", `/#workspace=${B}`);
      renderApp();

      await waitFor(() => expect(current()).toHaveTextContent(B));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(B);
    });

    it("shows an error and keeps the person's tasks when the linked workspace is gone", async () => {
      fakeBackend();
      const { user } = setupUser();
      window.history.replaceState(null, "", `/#workspace=${MISSING}`);
      renderApp();

      await user.click(await screen.findByRole("button", { name: "Yes, open it" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("couldn't find a workspace");
      expect(current()).toHaveTextContent(A);
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(A);
    });
  });
});
