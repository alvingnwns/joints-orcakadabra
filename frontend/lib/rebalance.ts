import { apiFetch } from "@/lib/api";

/** What "Rearrange my days" would do (or just did): tasks that move, and long tasks that split. */
export type RebalancePlan = {
  applied: boolean;
  capacity_minutes: number;
  moves: { task_id: string; title: string; from_date: string; to_date: string }[];
  splits: {
    task_id: string;
    title: string;
    total_minutes: number;
    parts: { title: string; date: string; minutes: number }[];
  }[];
};

/** `apply: false` only shows the plan; `apply: true` makes the changes. */
export const rebalance = (workspaceId: string, today: string, apply: boolean) =>
  apiFetch<RebalancePlan>("/tasks/rebalance", {
    method: "POST",
    headers: { "X-Workspace-Id": workspaceId },
    body: JSON.stringify({ today, apply }),
  });

export const isEmptyPlan = (plan: RebalancePlan) =>
  plan.moves.length === 0 && plan.splits.length === 0;
