import { describe, expect, it } from "vitest";

import type { Task, TaskStatus } from "@/lib/tasks";

import {
  LIBRARY_TABS,
  inTab,
  matchesQuery,
  sortTasks,
  tabCounts,
  visibleTasks,
} from "./library";

const today = "2026-10-15";

let n = 0;
const make = (extra: Partial<Task> = {}): Task => ({
  id: `t${++n}`,
  title: `Task ${n}`,
  due_date: null,
  estimated_minutes: null,
  impact_score: 3,
  status: "todo",
  created_at: `2026-10-0${(n % 9) + 1}T09:00:00Z`,
  ...extra,
});

describe("tabs", () => {
  it("puts a task due in 30 days under Upcoming, well outside the 7-day week", () => {
    const farAway = make({ due_date: "2026-11-14" });

    expect(inTab(farAway, "upcoming", today)).toBe(true);
    expect(inTab(farAway, "active", today)).toBe(true);
    expect(inTab(farAway, "unscheduled", today)).toBe(false);
  });

  it("does not call today or past-date tasks upcoming", () => {
    expect(inTab(make({ due_date: "2026-10-15" }), "upcoming", today)).toBe(false);
    expect(inTab(make({ due_date: "2026-10-01" }), "upcoming", today)).toBe(false);
  });

  it("keeps undated active tasks under Unscheduled", () => {
    expect(inTab(make(), "unscheduled", today)).toBe(true);
    expect(inTab(make({ due_date: "2026-10-20" }), "unscheduled", today)).toBe(false);
  });

  it("sends saved-for-later and finished tasks to their own tabs only", () => {
    const later = make({ status: "deferred", due_date: "2026-10-20" });
    const done = make({ status: "done" });

    expect(LIBRARY_TABS.filter((tab) => inTab(later, tab, today))).toEqual(["later"]);
    expect(LIBRARY_TABS.filter((tab) => inTab(done, tab, today))).toEqual(["completed"]);
  });

  it("treats in-progress tasks as active", () => {
    expect(inTab(make({ status: "in_progress" }), "active", today)).toBe(true);
  });

  it.each(["todo", "in_progress", "done", "deferred"] as TaskStatus[])(
    "never leaves a %s task without a tab, with or without a date",
    (status) => {
      for (const due_date of [null, "2026-09-01", "2026-10-15", "2026-10-16", "2027-06-01"]) {
        const task = make({ status, due_date });
        expect(LIBRARY_TABS.some((tab) => inTab(task, tab, today))).toBe(true);
      }
    },
  );

  it("counts tasks per tab", () => {
    const tasks = [
      make({ due_date: "2026-10-15" }),
      make({ due_date: "2026-12-01" }),
      make(),
      make({ status: "deferred" }),
      make({ status: "done" }),
      make({ status: "done" }),
    ];

    expect(tabCounts(tasks, today)).toEqual({
      active: 3,
      upcoming: 1,
      unscheduled: 1,
      later: 1,
      completed: 2,
    });
  });
});

describe("search", () => {
  it("matches part of a title, ignoring case and surrounding spaces", () => {
    const task = make({ title: "Buy Oat Milk" });

    expect(matchesQuery(task, "  oat ")).toBe(true);
    expect(matchesQuery(task, "MILK")).toBe(true);
    expect(matchesQuery(task, "bread")).toBe(false);
  });

  it("matches everything when the box is empty", () => {
    expect(matchesQuery(make(), "")).toBe(true);
    expect(matchesQuery(make(), "   ")).toBe(true);
  });

  it("handles Indonesian and accented text", () => {
    expect(matchesQuery(make({ title: "Telepon Ibu" }), "ibu")).toBe(true);
    expect(matchesQuery(make({ title: "Café" }), "CAFÉ")).toBe(true);
  });
});

describe("sorting", () => {
  it("orders by due date, earliest first, with undated tasks last", () => {
    const a = make({ title: "a", due_date: "2026-10-20" });
    const b = make({ title: "b", due_date: null });
    const c = make({ title: "c", due_date: "2026-10-16" });

    expect(sortTasks([a, b, c], "due").map((task) => task.title)).toEqual(["c", "a", "b"]);
  });

  it("orders newest first by when it was added", () => {
    const old = make({ title: "old", created_at: "2026-10-01T08:00:00Z" });
    const recent = make({ title: "recent", created_at: "2026-10-12T08:00:00Z" });

    expect(sortTasks([old, recent], "added").map((task) => task.title)).toEqual(["recent", "old"]);
  });

  it("orders finished tasks by when they were completed, latest first", () => {
    const first = make({ title: "first", status: "done", completed_at: "2026-10-10T10:00:00Z" });
    const second = make({ title: "second", status: "done", completed_at: "2026-10-14T10:00:00Z" });

    expect(sortTasks([first, second], "completed").map((task) => task.title)).toEqual([
      "second",
      "first",
    ]);
  });

  it("does not change the list it is given", () => {
    const list = [make({ due_date: "2026-10-20" }), make({ due_date: "2026-10-16" })];
    const before = list.map((task) => task.id);

    sortTasks(list, "due");

    expect(list.map((task) => task.id)).toEqual(before);
  });
});

describe("visibleTasks", () => {
  it("applies the tab, then the search, then the sort", () => {
    const tasks = [
      make({ title: "Pay rent", due_date: "2026-11-01" }),
      make({ title: "Pay tax", due_date: "2026-10-30" }),
      make({ title: "Pay later", status: "deferred" }),
      make({ title: "Call mum", due_date: "2026-10-31" }),
    ];

    const result = visibleTasks(tasks, "upcoming", "pay", "due", today);

    expect(result.map((task) => task.title)).toEqual(["Pay tax", "Pay rent"]);
  });
});
