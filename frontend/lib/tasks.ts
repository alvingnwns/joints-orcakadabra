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

const workspaceHeader = (workspaceId: string) => ({ "X-Workspace-Id": workspaceId });

export const listTasks = (workspaceId: string) =>
  apiFetch<Task[]>("/tasks", { headers: workspaceHeader(workspaceId) });

export const createTask = (workspaceId: string, task: NewTask) =>
  apiFetch<Task>("/tasks", {
    method: "POST",
    headers: workspaceHeader(workspaceId),
    body: JSON.stringify(task),
  });

export const updateTask = (workspaceId: string, id: string, changes: Partial<Task>) =>
  apiFetch<Task>(`/tasks/${id}`, {
    method: "PATCH",
    headers: workspaceHeader(workspaceId),
    body: JSON.stringify(changes),
  });

export const deleteTask = (workspaceId: string, id: string) =>
  apiFetch<void>(`/tasks/${id}`, { method: "DELETE", headers: workspaceHeader(workspaceId) });
