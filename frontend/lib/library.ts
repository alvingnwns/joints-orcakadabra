import type { Task } from "@/lib/tasks";

/**
 * Filtering and sorting for the All tasks page. It works on the full list from GET /tasks, so
 * nothing depends on the 7-day window of the week view: every task belongs to at least one tab.
 * (The API has no search, date range or paging, so all of this happens here.)
 */
export type LibraryTab = "active" | "upcoming" | "unscheduled" | "later" | "completed";
export type LibrarySort = "due" | "added" | "completed";

export const LIBRARY_TABS: LibraryTab[] = ["active", "upcoming", "unscheduled", "later", "completed"];

const isActive = (task: Task) => task.status === "todo" || task.status === "in_progress";

/** `today` is the user's local date, "YYYY-MM-DD". */
export function inTab(task: Task, tab: LibraryTab, today: string): boolean {
  switch (tab) {
    case "active":
      return isActive(task);
    case "upcoming":
      return isActive(task) && !!task.due_date && task.due_date > today;
    case "unscheduled":
      return isActive(task) && !task.due_date;
    case "later":
      return task.status === "deferred";
    case "completed":
      return task.status === "done";
  }
}

export function tabCounts(tasks: Task[], today: string): Record<LibraryTab, number> {
  const counts = { active: 0, upcoming: 0, unscheduled: 0, later: 0, completed: 0 };
  for (const task of tasks) {
    for (const tab of LIBRARY_TABS) if (inTab(task, tab, today)) counts[tab]++;
  }
  return counts;
}

/** Case-insensitive title search. An empty query matches everything. */
export function matchesQuery(task: Task, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  return !needle || task.title.toLocaleLowerCase().includes(needle);
}

const byText = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").localeCompare(b ?? "");

export function sortTasks(tasks: Task[], sort: LibrarySort): Task[] {
  const sorted = [...tasks];
  switch (sort) {
    case "due":
      // Earliest first; tasks without a date go last. Ties: the one added first.
      return sorted.sort(
        (a, b) =>
          Number(!a.due_date) - Number(!b.due_date) ||
          byText(a.due_date, b.due_date) ||
          byText(a.created_at, b.created_at) ||
          byText(a.title, b.title),
      );
    case "added":
      return sorted.sort((a, b) => byText(b.created_at, a.created_at));
    case "completed":
      return sorted.sort((a, b) => byText(b.completed_at, a.completed_at));
  }
}

export function visibleTasks(
  tasks: Task[],
  tab: LibraryTab,
  query: string,
  sort: LibrarySort,
  today: string,
): Task[] {
  return sortTasks(
    tasks.filter((task) => inTab(task, tab, today) && matchesQuery(task, query)),
    sort,
  );
}
