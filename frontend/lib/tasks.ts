import { apiFetch } from "@/lib/api";

export type TaskStatus = "todo" | "in_progress" | "done" | "deferred";

export type Task = {
  id: string;
  title: string;
  due_date: string | null; // "YYYY-MM-DD"
  estimated_minutes: number | null;
  impact_score: number;
  status: TaskStatus;
};

export type NewTask = {
  title: string;
  due_date?: string;
  estimated_minutes?: number;
  impact_score: number;
};

export type TaskChanges = Partial<Pick<Task, "title" | "due_date" | "estimated_minutes" | "status">>;

/** The user's local calendar date as "YYYY-MM-DD" (Q1), shifted by `offsetDays`. */
export function localDate(offsetDays = 0, now = new Date()): string {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

const workspaceHeader = (workspaceId: string) => ({ "X-Workspace-Id": workspaceId });

export const listTasks = (workspaceId: string) =>
  apiFetch<Task[]>("/tasks", { headers: workspaceHeader(workspaceId) });

export const createTask = (workspaceId: string, task: NewTask) =>
  apiFetch<Task>("/tasks", {
    method: "POST",
    headers: workspaceHeader(workspaceId),
    body: JSON.stringify(task),
  });

export const updateTask = (workspaceId: string, id: string, changes: TaskChanges) =>
  apiFetch<Task>(`/tasks/${id}`, {
    method: "PATCH",
    headers: workspaceHeader(workspaceId),
    body: JSON.stringify(changes),
  });

export const deleteTask = (workspaceId: string, id: string) =>
  apiFetch<void>(`/tasks/${id}`, { method: "DELETE", headers: workspaceHeader(workspaceId) });
