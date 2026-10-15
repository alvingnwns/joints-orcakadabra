import { apiFetch } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

/** A suggested duration for one task, with the AI's short reason. Nothing is saved by asking. */
export type Estimate = { estimated_minutes: number; estimate_reason: string };

// The backend may wait for the AI and retry once, so allow longer than the default 8 s.
const ESTIMATE_TIMEOUT_MS = 45_000;

export const estimateDuration = (
  workspaceId: string,
  task: { title: string; description?: string; locale: Locale },
) =>
  apiFetch<Estimate>(
    "/tasks/estimate",
    {
      method: "POST",
      headers: { "X-Workspace-Id": workspaceId },
      body: JSON.stringify(task),
    },
    ESTIMATE_TIMEOUT_MS,
  );
