import { fill } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/en";
import { type Task, daysBetween } from "@/lib/tasks";

type Translate = (key: TranslationKey) => string;

/**
 * Short, localized reasons a task is where it is, drawn from the same fields the backend ranks
 * on (due date, importance, length). This only explains; the ranking itself always comes from
 * the backend, and nothing here computes a score.
 */
export function taskReasons(task: Task, today: string, t: Translate): string[] {
  const reasons: string[] = [];

  if (!task.due_date) {
    reasons.push(t("reasonNoDate"));
  } else {
    const days = daysBetween(today, task.due_date);
    if (days < 0) reasons.push(t("reasonPast"));
    else if (days === 0) reasons.push(t("reasonDueToday"));
    else if (days === 1) reasons.push(t("reasonTomorrow"));
    else reasons.push(fill(t("reasonInDays"), { n: days }));
  }

  if (task.impact_score <= 2) reasons.push(t("reasonImpactSmall"));
  else if (task.impact_score === 3) reasons.push(t("reasonImpactMatters"));
  else reasons.push(t("reasonImpactReally"));

  if ((task.estimated_minutes ?? 0) > 120) reasons.push(t("reasonLong"));

  return reasons;
}

/** True when a top pick is not due today (later date or no date), so the page can say why. */
export function isNotDueToday(task: Task, today: string): boolean {
  return !task.due_date || daysBetween(today, task.due_date) > 0;
}
