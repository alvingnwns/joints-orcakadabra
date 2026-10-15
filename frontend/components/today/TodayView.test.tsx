import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import { shownIllustrations } from "@/components/illustrations/testing";
import type { HeavyLoad } from "@/lib/schedule";
import { type Task, localDate } from "@/lib/tasks";

import { TodayView } from "./TodayView";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const task = (id: string, title: string, extra: Partial<Task> = {}): Task => ({
  id,
  title,
  due_date: null,
  estimated_minutes: null,
  impact_score: 3,
  status: "todo",
  completed_at: null,
  ...extra,
});

type Options = { heavy?: HeavyLoad; suggest?: string; failToday?: number; failPatch?: boolean };

/**
 * In-memory backend. /tasks/today keeps the list order (ranking itself is tested in the backend):
 * the first 3 active tasks are the top, the others are the rest.
 */
function fakeBackend(initial: Task[], options: Options = {}) {
  const tasks = initial.map((item) => ({ ...item }));
  let todayFailures = options.failToday ?? 0;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { pathname, searchParams } = new URL(url);
    const method = init?.method ?? "GET";
    if (pathname === "/workspaces") return json({ id: "ws1" }, 201);
    if (pathname === "/tasks/today") {
      if (todayFailures-- > 0) throw new TypeError("Failed to fetch");
      const active = tasks.filter((item) => item.status === "todo");
      return json({
        today: searchParams.get("today"),
        top: active.slice(0, 3),
        rest: active.slice(3),
        heavy_load: options.heavy ?? null,
        delay_suggestion: options.suggest
          ? { task_id: options.suggest, reason: "lowest_priority" }
          : null,
      });
    }
    if (pathname === "/tasks" && method === "GET") return json(tasks);
    if (pathname === "/tasks/week") {
      // Today's load meter. The numbers come from the backend, so the fake just supplies some.
      const day = { date: searchParams.get("today"), total_minutes: 120, task_count: 1, is_heavy: false, tasks: [] };
      return json({
        today: searchParams.get("today"),
        capacity_minutes: 240,
        days: [day],
        unscheduled: { ...day, date: null, total_minutes: 0, task_count: 0 },
      });
    }
    if (pathname === "/tasks" && method === "POST") {
      const created = task(`t${tasks.length + 1}`, JSON.parse(init?.body as string).title);
      tasks.push(created);
      return json(created, 201);
    }
    const found = tasks.find((item) => pathname === `/tasks/${item.id}`);
    if (!found) return json({ detail: "not found" }, 404); // never fall through to a delete
    if (method === "PATCH") {
      if (options.failPatch) return json({ detail: "nope" }, 500);
      const changes = JSON.parse(init?.body as string);
      if (changes.status === "done") changes.completed_at = new Date().toISOString();
      return json(Object.assign(found, changes));
    }
    tasks.splice(tasks.indexOf(found), 1);
    return new Response(null, { status: 204 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderView() {
  render(
    <WorkspaceProvider>
      <TodayView />
    </WorkspaceProvider>,
  );
}

const heavy: HeavyLoad = {
  is_heavy: true,
  reason: "over_capacity",
  total_minutes: 300,
  capacity_minutes: 240,
};

describe("TodayView", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("greets with the mascot, today's date and how full the day is", async () => {
    fakeBackend([task("a", "Open")]);
    renderView();

    await screen.findByText("Today's load"); // the meter fills in once the numbers arrive
    const hero = screen.getByRole("heading", { level: 1, name: "Today" }).closest("section")!;
    expect(hero).toHaveTextContent(/Good (morning|afternoon|evening)/);
    expect(hero).toHaveTextContent("120 of 240 minutes"); // the backend's own totals
    expect(hero.querySelector('img[src$="/mascot/hello.svg"]')).not.toBeNull();
    expect(hero.querySelector("img")).toHaveAttribute("alt", ""); // decorative
  });

  it("still shows the day when the load numbers can't be loaded", async () => {
    const fetchMock = fakeBackend([task("a", "Open")]);
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      new URL(url).pathname === "/tasks/week" ? json({ detail: "x" }, 500) : base(url, init),
    );
    renderView();

    expect(await screen.findByLabelText(/Open/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument();
    expect(screen.queryByText("Today's load")).not.toBeInTheDocument();
  });

  it("puts adding a task first, then the sections with colored headings and counts", async () => {
    fakeBackend([task("a", "First"), task("b", "Second"), task("c", "Third"), task("d", "Fourth")]);
    renderView();

    const start = await screen.findByRole("heading", { name: "Start here" });
    expect(start.parentElement).toHaveTextContent("3"); // how many are in the section
    expect(screen.getByRole("heading", { name: "Also today" }).parentElement).toHaveTextContent("1");
    const add = screen.getByLabelText("What's one thing to do?");
    expect(add.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows a clear day, then the new task after adding one", async () => {
    const fetchMock = fakeBackend([]);
    renderView();

    expect(await screen.findByText(/Your day is clear/)).toBeInTheDocument();
    expect(shownIllustrations(document.body)).toEqual(["empty-tasks"]); // nothing yet
    const todayCall = fetchMock.mock.calls.find(([url]) => url.includes("/tasks/today"))!;
    expect(todayCall[0]).toContain(`today=${localDate(0)}`); // the user's local date

    await userEvent.type(screen.getByLabelText("What's one thing to do?"), "Buy milk");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("heading", { name: "Start here" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Buy milk/)).toBeInTheDocument();
  });

  it("shows the top 3 under 'Start here' and the others under 'Also today'", async () => {
    fakeBackend([task("a", "First"), task("b", "Second"), task("c", "Third"), task("d", "Fourth")]);
    renderView();

    const startHere = (await screen.findByRole("heading", { name: "Start here" })).closest(
      "section",
    )!;
    const alsoToday = screen.getByRole("heading", { name: "Also today" }).closest("section")!;
    expect(startHere).toHaveTextContent(/First.*Second.*Third/);
    expect(startHere).not.toHaveTextContent("Fourth");
    expect(alsoToday).toHaveTextContent("Fourth");
  });

  it("refreshes the top 3 after marking one done, and celebrates an all-done day", async () => {
    fakeBackend([task("a", "Only one")]);
    renderView();

    await userEvent.click(await screen.findByLabelText(/Only one/));

    expect(await screen.findByText(/That's everything for today/)).toBeInTheDocument();
    expect(screen.getByText("Done today (1)")).toBeInTheDocument();
    expect(shownIllustrations(document.body)).toEqual(["celebrate"]); // the toast's check burst
    expect(document.querySelector('img[src$="/mascot/happy.svg"]')).not.toBeNull(); // the mascot cheers
    // The toast has one short encouraging line from the small set.
    expect(screen.getByRole("status")).toHaveTextContent(
      /Done\. That counts\.|one less thing to carry|One small step, done\./,
    );
  });

  it("undoes marking a task done, on the server", async () => {
    const fetchMock = fakeBackend([task("a", "Only one")]);
    renderView();

    await userEvent.click(await screen.findByLabelText(/Only one/));
    await userEvent.click(await screen.findByRole("button", { name: "Undo" }));

    expect(await screen.findByText("Changed back.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Start here" })).toBeInTheDocument();
    const patches = fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH");
    expect(patches.map(([, init]) => JSON.parse(init!.body as string))).toEqual([
      { status: "done" },
      { status: "todo" },
    ]);
  });

  it("undoes 'Move it' by restoring the previous date", async () => {
    const fetchMock = fakeBackend([task("a", "Big"), task("b", "Small", { due_date: "2026-01-02" })], {
      heavy,
      suggest: "b",
    });
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Move it" }));
    await userEvent.click(await screen.findByRole("button", { name: "Yes, move it" }));
    await userEvent.click(await screen.findByRole("button", { name: "Undo" }));

    await screen.findByText("Changed back.");
    const patches = fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(patches[1][1]!.body as string)).toEqual({ due_date: "2026-01-02" });
  });

  it("undoes a delete by recreating the task with the same details", async () => {
    const fetchMock = fakeBackend([
      task("a", "Report", {
        description: "Quarterly numbers",
        due_date: "2026-10-20",
        estimated_minutes: 90,
        impact_score: 5,
      }),
    ]);
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Action" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
    expect(await screen.findByText("Task deleted.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(await screen.findByLabelText(/Report/)).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(
      ([url, init]) => url.endsWith("/tasks") && init?.method === "POST",
    )!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      title: "Report",
      impact_score: 5,
      description: "Quarterly numbers",
      due_date: "2026-10-20",
      estimated_minutes: 90,
    });
  });

  it("keeps keyboard focus on Undo when the task moves away", async () => {
    fakeBackend([task("a", "Open")]);
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Action" }));
    await userEvent.click(screen.getByRole("button", { name: "Not today, save for later" }));

    // The task left "Start here" (its buttons are gone), so focus moves to the toast.
    await waitFor(() => expect(screen.getByRole("button", { name: "Undo" })).toHaveFocus());
  });

  it("closes the toast with the close button", async () => {
    fakeBackend([task("a", "Only one")]);
    renderView();

    await userEvent.click(await screen.findByLabelText(/Only one/));
    await userEvent.click(await screen.findByRole("button", { name: "Close" }));

    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  it("shows the clear-day illustration when everything is saved for later", async () => {
    fakeBackend([task("a", "Someday", { status: "deferred" })]);
    renderView();

    expect(await screen.findByText(/Your day is clear/)).toBeInTheDocument();
    expect(shownIllustrations(document.body)).toEqual(["day-clear"]);
  });

  it("shows the heavy-load notice with the numbers, and only moves after a yes", async () => {
    const fetchMock = fakeBackend([task("a", "Big"), task("b", "Small deal")], {
      heavy,
      suggest: "b",
    });
    renderView();

    const notice = (await screen.findByRole("heading", { name: "A full day" })).parentElement!;
    expect(notice).toHaveTextContent("Small deal");
    expect(notice).toHaveTextContent("About 300 minutes planned, for a 240-minute day.");
    expect(notice).toHaveTextContent("It ranks lowest among today's tasks.");

    await userEvent.click(screen.getByRole("button", { name: "Move it" }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(false);

    await userEvent.click(screen.getByRole("button", { name: "Yes, move it" }));

    expect(await screen.findByText(/Moved to tomorrow/)).toBeInTheDocument();
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")!;
    expect(patch[0]).toContain("/tasks/b");
    expect(JSON.parse(patch[1]!.body as string)).toEqual({ due_date: localDate(1) });
  });

  it("says when a top pick is not due today", async () => {
    fakeBackend([
      task("a", "Due now", { due_date: localDate(0) }),
      task("b", "Whenever", { due_date: null }),
    ]);
    renderView();

    const cards = await screen.findAllByRole("listitem");
    expect(cards[0]).not.toHaveTextContent("Not due today");
    expect(cards[1]).toHaveTextContent("Not due today, but it ranks high");
  });

  it("edits a task from the Action menu, shows the result and offers Undo", async () => {
    const fetchMock = fakeBackend([task("a", "Report", { description: "Old notes" })]);
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Action" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit details" }));
    const title = screen.getByLabelText("Task");
    await userEvent.clear(title);
    await userEvent.type(title, "Report v2");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Task updated.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByLabelText(/Report v2/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    await screen.findByText("Changed back.");
    const patches = fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH");
    expect(patches.map(([, init]) => JSON.parse(init!.body as string))).toEqual([
      { title: "Report v2" },
      { title: "Report" },
    ]);
  });

  it("keeps the edit dialog open with the form intact when saving fails", async () => {
    fakeBackend([task("a", "Report")], { failPatch: true });
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Action" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit details" }));
    await userEvent.type(screen.getByLabelText("Task"), " v2");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/couldn't save your changes/)).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Edit task" })).toBeInTheDocument();
    expect(screen.getByLabelText("Task")).toHaveValue("Report v2");
    expect(screen.queryByText("Task updated.")).not.toBeInTheDocument();
  });

  it("lists tasks saved for later in the Later list", async () => {
    fakeBackend([task("a", "Open"), task("b", "Someday", { status: "deferred" })]);
    renderView();

    expect(await screen.findByText("Later (1)")).toBeInTheDocument();
  });

  it("keeps the screen as it was and shows a calm error when an action fails", async () => {
    fakeBackend([task("a", "Open")], { failPatch: true });
    renderView();

    await userEvent.click(await screen.findByLabelText(/Open/));

    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't go through.");
    expect(screen.getByLabelText(/Open/)).not.toBeChecked();
  });

  it("shows a calm error with retry when the day cannot be loaded", async () => {
    fakeBackend([task("a", "Open")], { failToday: 1 });
    renderView();

    expect(await screen.findByText(/couldn't load your day/)).toBeInTheDocument();
    expect(document.querySelector('img[src$="/mascot/oops.svg"]')).not.toBeNull(); // the mascot, a little worried
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByLabelText(/Open/)).toBeInTheDocument();
  });
});
