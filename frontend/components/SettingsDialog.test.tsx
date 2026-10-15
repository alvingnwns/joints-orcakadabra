import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/components/LocaleProvider";
import { WorkspaceProvider, useSettingsVersion } from "@/components/WorkspaceProvider";

import { SettingsDialog } from "./SettingsDialog";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

type Options = { capacity?: number; failLoad?: number; failSave?: boolean };

function fakeBackend({ capacity = 240, failLoad = 0, failSave = false }: Options = {}) {
  let stored = capacity;
  let loadFailures = failLoad;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { pathname } = new URL(url);
    const method = init?.method ?? "GET";
    if (pathname === "/workspaces") return json({ id: "ws1", daily_capacity_minutes: 240 }, 201);
    if (pathname === "/workspaces/ws1" && method === "PATCH") {
      if (failSave) return json({ detail: "nope" }, 500);
      stored = JSON.parse(init?.body as string).daily_capacity_minutes;
      return json({ id: "ws1", daily_capacity_minutes: stored });
    }
    if (pathname === "/workspaces/ws1") {
      if (loadFailures-- > 0) throw new TypeError("Failed to fetch");
      return json({ id: "ws1", daily_capacity_minutes: stored });
    }
    return json({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Shows the settings version so a test can see that pages would be told to reload. */
function VersionProbe() {
  return <p data-testid="version">{useSettingsVersion()}</p>;
}

function renderSettings() {
  render(
    <LocaleProvider>
      <WorkspaceProvider>
        <SettingsDialog />
        <VersionProbe />
      </WorkspaceProvider>
    </LocaleProvider>,
  );
}

const open = async () => {
  await userEvent.click(await screen.findByRole("button", { name: "Settings" }));
  return screen.getByRole("dialog", { name: "Settings" });
};
const slider = () => screen.getByRole("slider", { name: "Productive time per day" });
const patches = (fetchMock: ReturnType<typeof fakeBackend>) =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === "PATCH")
    .map(([, init]) => JSON.parse(init!.body as string));

describe("SettingsDialog", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("holds language, productive time and the About text in one place", async () => {
    fakeBackend();
    renderSettings();

    const dialog = await open();

    expect(screen.getByLabelText("Language")).toBeInTheDocument();
    expect(await screen.findByRole("slider")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("About this app");
    expect(dialog).toHaveTextContent("third-party AI provider");
    expect(dialog).not.toHaveTextContent(/therap|mental|professional care/i); // C2
  });

  it("shows the saved daily time in hours and minutes", async () => {
    fakeBackend({ capacity: 270 });
    renderSettings();
    await open();

    expect(await screen.findByRole("slider")).toHaveValue("270");
    expect(slider()).toHaveAttribute("aria-valuetext", "4 h 30 min");
    expect(screen.getByText("4 h 30 min", { selector: "output" })).toBeInTheDocument();
  });

  it("allows 30 to 720 minutes in steps of 15", async () => {
    fakeBackend();
    renderSettings();
    await open();

    const range = await screen.findByRole("slider");
    expect(range).toHaveAttribute("min", "30");
    expect(range).toHaveAttribute("max", "720");
    expect(range).toHaveAttribute("step", "15");
  });

  it("saves a preset, confirms it, and tells pages to load again", async () => {
    const fetchMock = fakeBackend();
    renderSettings();
    await open();
    await screen.findByRole("slider");
    expect(screen.getByTestId("version")).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled(); // nothing changed yet

    await userEvent.click(screen.getByRole("button", { name: "6 h" }));
    expect(screen.getByRole("button", { name: "6 h" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Saved. Your days now fit 6 h.")).toBeInTheDocument();
    expect(patches(fetchMock)).toEqual([{ daily_capacity_minutes: 360 }]);
    expect(screen.getByTestId("version")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled(); // saved, nothing new
  });

  it("keeps the chosen value and says so when saving fails", async () => {
    fakeBackend({ failSave: true });
    renderSettings();
    await open();
    await screen.findByRole("slider");

    await userEvent.click(screen.getByRole("button", { name: "2 h" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't save that just yet");
    expect(slider()).toHaveValue("120");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(); // can try again
    expect(screen.getByTestId("version")).toHaveTextContent("0");
  });

  it("shows a calm error with retry when the settings cannot be loaded", async () => {
    fakeBackend({ failLoad: 1 });
    renderSettings();
    await open();

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load your settings");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("slider")).toHaveValue("240");
  });

  it("changes the language from inside Settings, and in Indonesian says Pengaturan", async () => {
    fakeBackend();
    renderSettings();
    await open();

    await userEvent.selectOptions(screen.getByLabelText("Language"), "id");

    expect(screen.getByRole("dialog", { name: "Pengaturan" })).toBeInTheDocument();
    expect(await screen.findByText("Waktu produktif harian")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Waktu produktif per hari" })).toBeInTheDocument();
  });

  it("closes with the Close button", async () => {
    fakeBackend();
    renderSettings();
    await open();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
