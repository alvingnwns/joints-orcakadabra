import { apiFetch } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

// The backend may wait for the AI and its fallback model, so allow longer than the default 8 s.
const CHAT_TIMEOUT_MS = 45_000;

export type ChatQuestion = {
  question: string;
  today: string; // the user's local date, "YYYY-MM-DD"
  locale: Locale;
  task_id?: string; // "Why is this here?" for one task
};

export const askSchedule = (workspaceId: string, query: ChatQuestion) =>
  apiFetch<{ answer: string }>(
    "/chat/query",
    {
      method: "POST",
      headers: { "X-Workspace-Id": workspaceId },
      body: JSON.stringify(query),
    },
    CHAT_TIMEOUT_MS,
  );
