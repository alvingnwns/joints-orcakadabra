import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import type { Task } from "@/lib/tasks";

import { TasksView } from "./TasksView";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** In-memory fake of the backend endpoints that this screen uses. */
function fakeBackend(initial: Task[] = [], options: { failList?: number; failPatch?: boolean } = {}) {
  const tasks = initial.map((task) => ({ ...task })); // copies, so tests don't leak changes
  let listFailures = options.failList ?? 0;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { pathname } = new URL(url);
    const method = init?.method ?? "GET";
    if (pathname === "/workspaces") return json({ id: "ws1" }, 201);
    if (pathname === "/tasks" && method === "GET") {
      if (listFailures-- > 0) throw new TypeError("Failed to fetch");
      return json(tasks);
    }
    if (pathname === "/tasks" && method === "POST") {
      const body = JSON.parse(init?.body as string);
      const task: Task = {
        id: `t${tasks.length + 1}`,
        due_date: null,
        estimated_minutes: null,
        status: "todo",
        ...body,
      };
      tasks.push(task);
      return json(task, 201);
    }
    const task = tasks.find((item) => pathname === `/tasks/${item.id}`)!;
    if (method === "PATCH") {
      if (options.failPatch) return json({ detail: "nope" }, 500);
      return json(Object.assign(task, JSON.parse(init?.body as string)));
    }
    tasks.splice(tasks.indexOf(task), 1);
    return new Response(null, { status: 204 });
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

const existing: Task = {
  id: "t1",
  title: "Write report",
  due_date: null,
  estimated_minutes: null,
  impact_score: 3,
  status: "todo",
};

describe("TasksView", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("shows a friendly empty state, then the new task after adding one", async () => {
    fakeBackend();
    renderView();

    expect(await screen.findByText("Nothing here yet — add one small thing.")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("What's one thing to do?"), "Buy milk");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByLabelText(/Buy milk/)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing here yet/)).not.toBeInTheDocument();
  });

  it("shows existing tasks and lets you mark one done", async () => {
    const fetchMock = fakeBackend([existing]);
    renderView();

    await userEvent.click(await screen.findByLabelText(/Write report/));

    expect(await screen.findByLabelText(/Write report/)).toBeChecked();
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")!;
    expect(JSON.parse(patch[1]!.body as string)).toEqual({ status: "done" });
  });

  it("deletes a task after confirmation", async () => {
    fakeBackend([existing]);
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, delete" }));

    expect(await screen.findByText(/Nothing here yet/)).toBeInTheDocument();
  });

  it("shows a calm error with retry when the list cannot be loaded", async () => {
    fakeBackend([existing], { failList: 1 });
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByLabelText(/Write report/)).toBeInTheDocument();
  });

  it("saves a task for later, shows a kind note, and brings it back", async () => {
    fakeBackend([existing]);
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Change plans" }));
    await userEvent.click(screen.getByRole("button", { name: "Not today, save for later" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Saved for later. You can bring it back anytime.",
    );
    expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument();
    expect(screen.getByText("Later (1)")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Later (1)"));
    await userEvent.click(screen.getByRole("button", { name: "Bring back" }));

    expect(await screen.findByRole("status")).toHaveTextContent("It's back on your list.");
    expect(screen.queryByText(/Later/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change plans" })).toBeInTheDocument();
  });

  it("rolls back an optimistic change when the server refuses it", async () => {
    fakeBackend([existing], { failPatch: true });
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Change plans" }));
    await userEvent.click(screen.getByRole("button", { name: "Not today, save for later" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't go through.");
    expect(screen.queryByText(/Later/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change plans" })).toBeInTheDocument();
  });
});
