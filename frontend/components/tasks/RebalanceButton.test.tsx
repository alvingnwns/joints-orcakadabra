import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/components/LocaleProvider";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import type { RebalancePlan } from "@/lib/rebalance";
import { localDate } from "@/lib/tasks";

import { RebalanceButton } from "./RebalanceButton";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const plan: RebalancePlan = {
  applied: false,
  capacity_minutes: 240,
  moves: [
    { task_id: "m1", title: "Tidy desk", from_date: localDate(0), to_date: localDate(1) },
    { task_id: "m2", title: "Water plants", from_date: localDate(0), to_date: localDate(2) },
  ],
  splits: [
    {
      task_id: "s1",
      title: "Write the thesis chapter",
      total_minutes: 600,
      parts: [
        { title: "Write the thesis chapter (1/3)", date: localDate(0), minutes: 200 },
        { title: "Write the thesis chapter (2/3)", date: localDate(1), minutes: 200 },
        { title: "Write the thesis chapter (3/3)", date: localDate(2), minutes: 200 },
      ],
    },
  ],
};
const empty: RebalancePlan = { ...plan, moves: [], splits: [] };

type Options = { plan?: RebalancePlan; failPreview?: number; failApply?: number };

function fakeBackend({ plan: result = plan, failPreview = 0, failApply = 0 }: Options = {}) {
  let previewFailures = failPreview;
  let applyFailures = failApply;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { pathname } = new URL(url);
    if (pathname === "/workspaces") return json({ id: "ws1" }, 201);
    if (pathname === "/tasks/rebalance") {
      const body = JSON.parse(init?.body as string);
      if (body.apply ? applyFailures-- > 0 : previewFailures-- > 0) {
        return json({ detail: "boom" }, 500);
      }
      return json({ ...result, applied: body.apply });
    }
    return json({ detail: "not found" }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const calls = (fetchMock: ReturnType<typeof fakeBackend>) =>
  fetchMock.mock.calls
    .filter(([url]) => new URL(url).pathname === "/tasks/rebalance")
    .map(([, init]) => JSON.parse(init!.body as string) as { today: string; apply: boolean });

function renderButton(onDone = vi.fn()) {
  render(
    <LocaleProvider>
      <WorkspaceProvider>
        <RebalanceButton onDone={onDone} />
      </WorkspaceProvider>
    </LocaleProvider>,
  );
  return onDone;
}

const open = async () => {
  await userEvent.click(await screen.findByRole("button", { name: "Rearrange my days" }));
  return screen.getByRole("dialog", { name: "Rearrange your days" });
};

describe("RebalanceButton", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("only previews when opened: nothing is changed, and it asks with the user's own date", async () => {
    const backend = fakeBackend();
    renderButton();

    await open();
    await screen.findByText("Moving to a day with room");

    expect(calls(backend)).toEqual([{ today: localDate(0), apply: false }]);
  });

  it("explains what would move and which long task would split, in plain words", async () => {
    fakeBackend();
    renderButton();
    const dialog = await open();

    expect(await within(dialog).findByText("Moving to a day with room")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("A day holds about 4 h.");
    expect(dialog).toHaveTextContent("Tidy desk moves to");
    expect(dialog).toHaveTextContent("Water plants moves to");
    expect(dialog).toHaveTextContent("Long tasks split into parts");
    expect(dialog).toHaveTextContent("Write the thesis chapter (10 h) becomes 3 parts:");
    expect(dialog).toHaveTextContent("Write the thesis chapter (1/3)");
    expect(dialog).toHaveTextContent("3 h 20 min");
    expect(dialog).toHaveTextContent("Nothing changes until you confirm");
  });

  it("changes nothing when the person cancels", async () => {
    const backend = fakeBackend();
    const onDone = renderButton();
    await open();
    await screen.findByText("Moving to a day with room");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(calls(backend).every((call) => call.apply === false)).toBe(true);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("applies on confirm, says it is done, and tells the page only when the dialog closes", async () => {
    const backend = fakeBackend();
    const onDone = renderButton();
    await open();
    await screen.findByText("Moving to a day with room");

    await userEvent.click(screen.getByRole("button", { name: "Rearrange" }));

    expect(await screen.findByText("Done. Your days now fit.")).toBeInTheDocument();
    expect(calls(backend)).toEqual([
      { today: localDate(0), apply: false },
      { today: localDate(0), apply: true },
    ]);
    expect(onDone).not.toHaveBeenCalled(); // the summary stays up first

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onDone).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the plan and says nothing was changed when applying fails, then can try again", async () => {
    fakeBackend({ failApply: 1 });
    const onDone = renderButton();
    await open();
    await screen.findByText("Moving to a day with room");

    await userEvent.click(screen.getByRole("button", { name: "Rearrange" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was changed");
    expect(screen.getByText("Moving to a day with room")).toBeInTheDocument(); // plan still there
    expect(onDone).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Rearrange" }));
    expect(await screen.findByText("Done. Your days now fit.")).toBeInTheDocument();
  });

  it("says so when nothing needs to move", async () => {
    fakeBackend({ plan: empty });
    renderButton();
    const dialog = await open();

    expect(await within(dialog).findByText("Nothing needs to move. Every day fits.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Rearrange" })).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a calm error with retry when the plan cannot be worked out", async () => {
    fakeBackend({ failPreview: 1 });
    renderButton();
    await open();

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't work out a plan");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Moving to a day with room")).toBeInTheDocument();
  });

  it("works in Indonesian", async () => {
    localStorage.setItem("orca.locale", "id");
    fakeBackend();
    renderButton();

    await userEvent.click(await screen.findByRole("button", { name: "Atur ulang hariku" }));
    const dialog = await screen.findByRole("dialog", { name: "Atur ulang hari-harimu" });

    expect(await within(dialog).findByText("Dipindah ke hari yang masih muat")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Satu hari muat sekitar 4 j.");
    expect(dialog).toHaveTextContent("Tidak ada yang berubah sampai kamu setuju");
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Atur ulang" })).toBeEnabled());
  });
});
