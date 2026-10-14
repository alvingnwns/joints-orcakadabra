import { apiFetch } from "@/lib/api";
import type { Task } from "@/lib/tasks";

/** A task scored by the backend for the user's `today`. */
export type ScheduledTask = Task & {
  priority_score: number;
  priority_label: "focus" | "soon" | "whenever";
  reasons: string[]; // English context for the AI chat; not shown in the UI
};

export type HeavyLoad = {
  is_heavy: true;
  reason: "over_capacity" | "many_long_tasks";
  total_minutes: number;
  capacity_minutes: number;
};

export type TodaySchedule = {
  today: string;
  top: ScheduledTask[];
  rest: ScheduledTask[];
  heavy_load: HeavyLoad | null;
  delay_suggestion: { task_id: string; reason: "past_its_date" | "lowest_priority" } | null;
};

export type DayLoad = {
  date: string | null; // null for the "unscheduled" bucket
  total_minutes: number;
  task_count: number;
  is_heavy: boolean;
  tasks: ScheduledTask[];
};

export type WeekSchedule = {
  today: string;
  capacity_minutes: number;
  days: DayLoad[];
  unscheduled: DayLoad;
};

const headers = (workspaceId: string) => ({ "X-Workspace-Id": workspaceId });

/** `today` is the user's local date (Q1), as "YYYY-MM-DD". */
export const getToday = (workspaceId: string, today: string) =>
  apiFetch<TodaySchedule>(`/tasks/today?today=${today}`, { headers: headers(workspaceId) });

export const getWeek = (workspaceId: string, today: string) =>
  apiFetch<WeekSchedule>(`/tasks/week?today=${today}`, { headers: headers(workspaceId) });
