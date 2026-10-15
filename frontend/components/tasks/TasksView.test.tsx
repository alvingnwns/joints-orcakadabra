import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import { type Task, localDate } from "@/lib/tasks";

import { TasksView } from "./TasksView";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let n = 0;
const task = (title: string, extra: Partial<Task> = {}): Task => ({
  id: `t${++n}`,
  title,
  due_date: null,
  estimated_minutes: null,
  impact_score: 3,
  status: "todo",
  created_at: `2026-10-${String(10 + n).padStart(2, "0")}T09:00:00Z`,
  completed_at: null,
  ...extra,
});

function fakeBackend(initial: Task[], options: { failList?: number } = {}) {
  const tasks = initial.map((item) => ({ ...item }));
  let failures = options.failList ?? 0;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { pathname } = new URL(url);
    const method = init?.method ?? "GET";
    if (pathname === "/workspaces") return json({ id: "ws1" }, 201);
    if (pathname === "/tasks" && method === "GET") {
      if (failures-- > 0) throw new TypeError("Failed to fetch");
      return json(tasks);
    }
    const found = tasks.find((item) => pathname === `/tasks/${item.id}`)!;
    if (method === "PATCH") {
      const changes = JSON.parse(init?.body as string);
      if (changes.status === "done") changes.completed_at = new Date().toISOString();
      return json(Object.assign(found, changes));
    }
    return json({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderView() {
  render(
    <WorkspaceProvider>
      <TasksView />
    </WorkspaceProvider>,
  );
}

const tab = (name: RegExp) => screen.getByRole("button", { name });
const titles = () =>
  screen.queryAllByRole("checkbox").map((box) => box.getAttribute("aria-labelledby"))
    .map((id) => document.getElementById(id!)!.textContent);
/** The "4 tasks" line under the filters. (The toast also has role="status", so match by text.) */
const countLine = () => screen.getByText(/^\d+ tasks?$/);

describe("TasksView (All tasks)", () => {
  beforeEach(() => {
    localStorage.clear();
    n = 0;
  });
  afterEach(() => vi.unstubAllGlobals());

  const sample = () => [
    task("Due today", { due_date: localDate(0) }),
    task("In two weeks", { due_date: localDate(14) }),
    task("Next month", { due_date: localDate(30) }),
    task("Someday", { due_date: null }),
    task("Saved for later", { status: "deferred" }),
    task("Finished early", { status: "done", completed_at: "2026-10-12T10:00:00Z" }),
    task("Finished last", { status: "done", completed_at: "2026-10-14T10:00:00Z" }),
  ];

  it("starts on Active and shows how many tasks each list has", async () => {
    fakeBackend(sample());
    renderView();

    expect(await screen.findByRole("heading", { level: 1, name: "All tasks" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^Active/ })).toHaveTextContent("Active (4)");
    expect(tab(/^Upcoming/)).toHaveTextContent("Upcoming (2)");
    expect(tab(/^No date/)).toHaveTextContent("No date (1)");
    expect(tab(/^Later/)).toHaveTextContent("Later (1)");
    expect(tab(/^Completed/)).toHaveTextContent("Completed (2)");
    expect(tab(/^Active/)).toHaveAttribute("aria-pressed", "true");
    expect(titles()).toEqual(["Due today", "In two weeks", "Next month", "Someday"]); // by due date
    expect(countLine()).toHaveTextContent("4 tasks");
  });

  it("finds a task due in 30 days under Upcoming, far past the week view", async () => {
    fakeBackend(sample());
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: /^Upcoming/ }));

    expect(titles()).toEqual(["In two weeks", "Next month"]);
  });

  it("lists undated, saved-for-later and finished tasks in their own lists", async () => {
    fakeBackend(sample());
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: /^No date/ }));
    expect(titles()).toEqual(["Someday"]);

    await userEvent.click(tab(/^Later/));
    expect(titles()).toEqual(["Saved for later"]);

    await userEvent.click(tab(/^Completed/));
    expect(titles()).toEqual(["Finished last", "Finished early"]); // latest finish first
  });

  it("searches titles within the chosen list and says when nothing matches", async () => {
    fakeBackend(sample());
    renderView();

    await userEvent.type(await screen.findByLabelText("Search by title"), "MONTH");
    expect(titles()).toEqual(["Next month"]);
    expect(countLine()).toHaveTextContent("1 task");

    await userEvent.clear(screen.getByLabelText("Search by title"));
    await userEvent.type(screen.getByLabelText("Search by title"), "zebra");
    expect(screen.getByText(/No tasks match “zebra” in this list/)).toBeInTheDocument();
    expect(countLine()).toHaveTextContent("0 tasks");
  });

  it("sorts by when a task was added", async () => {
    fakeBackend(sample());
    renderView();

    await userEvent.selectOptions(await screen.findByLabelText("Sort by"), "Recently added");

    expect(titles()).toEqual(["Someday", "Next month", "In two weeks", "Due today"]);
  });

  it("offers 'Recently completed' only for finished tasks", async () => {
    fakeBackend(sample());
    renderView();
    const sortOptions = async () =>
      within(await screen.findByLabelText("Sort by")).getAllByRole("option").map((o) => o.textContent);

    expect(await sortOptions()).toEqual(["Due date", "Recently added"]);

    await userEvent.click(tab(/^Completed/));
    expect(await sortOptions()).toContain("Recently completed");
    expect(screen.getByLabelText("Sort by")).toHaveValue("completed");

    await userEvent.click(tab(/^Active/));
    expect(screen.getByLabelText("Sort by")).toHaveValue("due");
  });

  it("shows a friendly line for an empty list", async () => {
    fakeBackend([task("Only one", { due_date: localDate(0) })]);
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: /^Later/ }));

    expect(screen.getByText("Nothing saved for later.")).toBeInTheDocument();
  });

  it("guides a brand-new person instead of showing a blank page", async () => {
    fakeBackend([]);
    renderView();

    expect(await screen.findByText(/Nothing active right now/)).toBeInTheDocument();
  });

  it("keeps the list, search and counts in step after an action", async () => {
    fakeBackend(sample());
    renderView();
    await userEvent.type(await screen.findByLabelText("Search by title"), "today");

    await userEvent.click(screen.getByRole("checkbox", { name: "Due today" }));

    await vi.waitFor(() => expect(tab(/^Completed/)).toHaveTextContent("Completed (3)"));
    expect(tab(/^Active/)).toHaveTextContent("Active (3)");
    expect(screen.getByLabelText("Search by title")).toHaveValue("today"); // search kept
    expect(tab(/^Active/)).toHaveAttribute("aria-pressed", "true"); // tab kept
  });

  it("edits and deletes from the list through the same More menu", async () => {
    fakeBackend([task("Report", { due_date: localDate(0) })]);
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "More" }));

    expect(screen.getByRole("button", { name: "Edit details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("shows a calm error with retry when the list cannot be loaded", async () => {
    fakeBackend([task("Report")], { failList: 1 });
    renderView();

    expect(await screen.findByText(/couldn't load your tasks/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("checkbox", { name: "Report" })).toBeInTheDocument();
  });
});
