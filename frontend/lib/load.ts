import type { TranslationKey } from "@/lib/i18n/en";

/**
 * How full a day is, for the week view and the Today meter. "full" comes from the backend's
 * own verdict (`is_heavy`); "busy" is the heads-up before that: three quarters of the way to
 * the person's daily capacity.
 */
export type LoadLevel = "none" | "light" | "busy" | "full";

export const BUSY_RATIO = 0.75;

export function loadLevel(totalMinutes: number, capacity: number, isHeavy: boolean): LoadLevel {
  if (totalMinutes === 0) return "none";
  if (isHeavy) return "full";
  return totalMinutes / capacity >= BUSY_RATIO ? "busy" : "light";
}

export const LOAD_LABEL: Record<LoadLevel, TranslationKey> = {
  none: "loadNone",
  light: "loadLight",
  busy: "loadBusy",
  full: "loadFull",
};

/** "4 h", "3 h 45 min", "45 min": a length of time in the person's language. */
export function formatDuration(
  minutes: number,
  t: (key: TranslationKey) => string,
): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts: string[] = [];
  if (hours) parts.push(`${hours} ${t("hoursShort")}`);
  if (rest || !hours) parts.push(`${rest} ${t("minutesShort")}`);
  return parts.join(" ");
}
