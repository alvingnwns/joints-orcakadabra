import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import type { DayLoad, ScheduledTask, WeekSchedule } from "@/lib/schedule";
import { localDate } from "@/lib/tasks";

import { loadLabel } from "./LoadBar";
import { WeekView } from "./WeekView";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const scheduled = (id: string, title: string): ScheduledTask => ({
  id,
  title,
  due_date: null,
  estimated_minutes: null,
  impact_score: 3,
  status: "todo",
  priority_score: 4,
  priority_label: "whenever",
  reasons: [],
});

const bucket = (date: string | null, tasks: ScheduledTask[] = [], minutes = 0, heavy = false) =>
  ({
    date,
    total_minutes: minutes,
    task_count: tasks.length,
    is_heavy: heavy,
    tasks,
  }) satisfies DayLoad;

function week(days: Partial<Record<number, DayLoad>> = {}, unscheduled = bucket(null)): WeekSchedule {
  return {
    today: localDate(0),
    capacity_minutes: 240,
    days: Array.from({ length: 7 }, (_, n) => days[n] ?? bucket(localDate(n))),
    unscheduled,
  };
}

function fakeBackend(responses: (WeekSchedule | Error)[]) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { pathname } = new URL(url);
    if (pathname === "/workspaces") return json({ id: "ws1" }, 201);
    if (pathname === "/tasks/week") {
      const next = responses.length > 1 ? responses.shift()! : responses[0];
      if (next instanceof Error) throw next;
      return json(next);
    }
    if (init?.method === "PATCH") return json({ ...scheduled("x", "x"), ...JSON.parse(init.body as string) });
    return json({ detail: "not found" }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderView() {
  render(
    <WorkspaceProvider>
      <WeekView />
    </WorkspaceProvider>,
  );
}

describe("loadLabel", () => {
  it("always gives a text label, never color alone", () => {
    expect(loadLabel(0, 240, false)).toBe("loadNone");
    expect(loadLabel(60, 240, false)).toBe("loadLight");
    expect(loadLabel(180, 240, false)).toBe("loadBusy");
    expect(loadLabel(300, 240, true)).toBe("loadFull");
  });
});

describe("WeekView", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("shows an open week when nothing is planned, and asks for the user's local date", async () => {
    const fetchMock = fakeBackend([week()]);
    renderView();

    expect(await screen.findByText(/Your week is wide open/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(6);
    const call = fetchMock.mock.calls.find(([url]) => url.includes("/tasks/week"))!;
    expect(call[0]).toContain(`today=${localDate(0)}`);
  });

  it("labels each day's load in words and lists the chosen day's tasks", async () => {
    fakeBackend([
      week({
        0: bucket(localDate(0), [scheduled("a", "Report")], 300, true),
        2: bucket(localDate(2), [scheduled("b", "Call the bank")], 60),
      }),
    ]);
    renderView();

    const today = await screen.findByRole("button", { name: /Today/, pressed: true });
    expect(today).toHaveTextContent("Full day");
    expect(today).toHaveTextContent("300 / 240 min");
    expect(screen.getByLabelText(/Report/)).toBeInTheDocument();

    const dayTwo = screen.getAllByRole("button", { pressed: false })[1];
    expect(dayTwo).toHaveTextContent("Room to breathe");
    await userEvent.click(dayTwo);

    expect(dayTwo).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/Call the bank/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Report/)).not.toBeInTheDocument();
  });

  it("shows a gentle note for a day with nothing planned", async () => {
    fakeBackend([week({ 1: bucket(localDate(1), [scheduled("a", "Tomorrow task")], 30) })]);
    renderView();

    expect(await screen.findByText("Nothing planned for that day.")).toBeInTheDocument();
  });

  it("lists tasks without a date, with the CP8 actions", async () => {
    fakeBackend([week({}, bucket(null, [scheduled("u", "Someday idea")], 30))]);
    renderView();

    const section = (await screen.findByRole("heading", { name: "No date yet (1)" }))
      .parentElement!;
    expect(within(section).getByLabelText(/Someday idea/)).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Change plans" })).toBeInTheDocument();
  });

  it("reloads the week after an action", async () => {
    const before = week({ 0: bucket(localDate(0), [scheduled("a", "Report")], 30) });
    const after = week({ 1: bucket(localDate(1), [scheduled("a", "Report")], 30) });
    fakeBackend([before, after]);
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Change plans" }));
    await userEvent.click(screen.getByRole("button", { name: "Move to tomorrow" }));

    expect(await screen.findByText(/Moved to tomorrow/)).toBeInTheDocument();
    expect(screen.getByText("Nothing planned for that day.")).toBeInTheDocument();
  });

  it("shows a calm error with retry", async () => {
    fakeBackend([new TypeError("Failed to fetch"), week()]);
    renderView();

    expect(await screen.findByText(/couldn't load your week/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText(/Your week is wide open/)).toBeInTheDocument();
  });
});
