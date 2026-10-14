import { apiFetch } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import type { NewTask, Task } from "@/lib/tasks";

/** A task suggested by the AI from a brain dump. Nothing is saved until the user approves. */
export type Draft = {
  title: string;
  due_date: string | null;
  estimated_minutes: number | null;
  needs_confirmation: boolean;
  note: string | null;
};

// The backend may wait 20 s for the AI and retry once, so allow longer than the default 8 s.
const PARSE_TIMEOUT_MS = 45_000;

const headers = (workspaceId: string) => ({ "X-Workspace-Id": workspaceId });

export const parseBrainDump = (workspaceId: string, text: string, today: string, locale: Locale) =>
  apiFetch<{ drafts: Draft[] }>(
    "/tasks/parse",
    {
      method: "POST",
      headers: headers(workspaceId),
      body: JSON.stringify({ text, today, locale }),
    },
    PARSE_TIMEOUT_MS,
  );

export const saveDrafts = (workspaceId: string, tasks: NewTask[]) =>
  apiFetch<Task[]>("/tasks/bulk", {
    method: "POST",
    headers: headers(workspaceId),
    body: JSON.stringify({ tasks }),
  });
