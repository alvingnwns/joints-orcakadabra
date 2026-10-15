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
    if (pathname === "/tasks" && init?.method === "POST") {
      return json({ ...scheduled("new", "new"), ...JSON.parse(init.body as string) }, 201);
    }
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
    expect(today).toHaveTextContent("300 of 240 minutes");
    expect(today).toHaveTextContent("1 task");
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

    const section = (await screen.findByRole("heading", { name: "No date yet (1)" })).closest(
      "section",
    )!;
    expect(within(section).getByLabelText(/Someday idea/)).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("reloads the week after an action", async () => {
    const before = week({ 0: bucket(localDate(0), [scheduled("a", "Report")], 30) });
    const after = week({ 1: bucket(localDate(1), [scheduled("a", "Report")], 30) });
    fakeBackend([before, after]);
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Action" }));
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

  it("colors each day by how full it is, including the date, with a word for each", async () => {
    fakeBackend([
      week({
        0: bucket(localDate(0), [scheduled("a", "Big")], 300, true), // over capacity: full
        1: bucket(localDate(1), [scheduled("b", "Nearly")], 200), // 83 percent: almost full
        2: bucket(localDate(2), [scheduled("c", "Small")], 60), // room to breathe
      }),
    ]);
    renderView();

    const full = await screen.findByRole("button", { name: /Today/ });
    const almost = screen.getByRole("button", { name: /200 of 240/ });
    const light = screen.getByRole("button", { name: /60 of 240/ });
    const empty = screen.getAllByRole("button", { name: /Nothing planned/ })[0];
    const dateOf = (day: HTMLElement) => day.querySelector("span.font-bold")!;

    expect(full).toHaveClass("border-warm", "bg-warm-soft");
    expect(dateOf(full)).toHaveClass("text-warm-text");
    expect(full).toHaveTextContent("Full day");

    expect(almost).toHaveClass("border-soon", "bg-soon-soft");
    expect(dateOf(almost)).toHaveClass("text-soon-text");
    expect(almost).toHaveTextContent("Almost full");

    expect(light).toHaveClass("border-border", "bg-surface");
    expect(dateOf(light)).toHaveClass("text-text");
    expect(light).toHaveTextContent("Room to breathe");

    expect(empty).toHaveTextContent("Nothing planned");
    // The nearly-full and full days also carry an icon, so color is never the only signal.
    expect(almost.querySelector("svg")).not.toBeNull();
    expect(full.querySelector("svg")).not.toBeNull();
  });

  it("judges 'almost full' against the person's own daily time", async () => {
    const bigDay = { ...week({ 1: bucket(localDate(1), [scheduled("a", "Long")], 200) }) };
    fakeBackend([{ ...bigDay, capacity_minutes: 480 }]); // 200 of 480 is only 42 percent

    renderView();

    const day = await screen.findByRole("button", { name: /200 of 480 minutes/ });
    expect(day).toHaveTextContent("Room to breathe");
    expect(day).not.toHaveClass("bg-soon-soft");
  });

  it("counts the tasks on each day", async () => {
    fakeBackend([
      week({
        0: bucket(localDate(0), [scheduled("a", "One")], 30),
        1: bucket(localDate(1), [scheduled("b", "Two"), scheduled("c", "Three")], 60),
      }),
    ]);
    renderView();

    const today = await screen.findByRole("button", { name: /Today/, pressed: true });
    expect(today).toHaveTextContent("1 task");
    expect(today).toHaveTextContent("30 of 240 minutes");
    expect(screen.getByRole("button", { name: /2 tasks/ })).toHaveTextContent("60 of 240 minutes");
    expect(screen.getAllByRole("button", { name: /0 tasks/ })).toHaveLength(5);
  });

  it("adds a task to the selected day, with that day's date", async () => {
    const fetchMock = fakeBackend([week()]);
    renderView();

    await userEvent.click((await screen.findAllByRole("button", { pressed: false }))[1]); // day 3
    expect(screen.getByText(/It will be set for/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("What's one thing to do?"), "Book the dentist");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.filter(([url]) => url.includes("/tasks/week"))).toHaveLength(2),
    );
    const post = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === "POST" && url.endsWith("/tasks"),
    )!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      title: "Book the dentist",
      impact_score: 3,
      due_date: localDate(2),
    });
    expect(screen.getByLabelText("What's one thing to do?")).toHaveValue(""); // ready for the next
    expect(screen.getByText(/It will be set for/)).toBeInTheDocument(); // still this day
  });

  it("starts today's form with today's date, and a fresh one for each day", async () => {
    fakeBackend([week()]);
    renderView();

    const input = await screen.findByLabelText("What's one thing to do?");
    await userEvent.type(input, "half-typed");
    await userEvent.click(screen.getAllByRole("button", { pressed: false })[0]);

    expect(screen.getByLabelText("What's one thing to do?")).toHaveValue("");
  });

  it("keeps what was typed when adding fails", async () => {
    const fetchMock = fakeBackend([week()]);
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const { pathname } = new URL(url);
      if (pathname === "/workspaces") return json({ id: "ws1" }, 201);
      if (pathname === "/tasks/week") return json(week());
      if (init?.method === "POST") return json({ detail: "nope" }, 500);
      return json({}, 404);
    });
    renderView();

    await userEvent.type(await screen.findByLabelText("What's one thing to do?"), "Call mum");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("still here");
    expect(screen.getByLabelText("What's one thing to do?")).toHaveValue("Call mum");
  });
});
