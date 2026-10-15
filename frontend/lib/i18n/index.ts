import { type Dictionary, en } from "./en";
import { id } from "./id";

/** To add a language: create its dictionary file and add one entry here. */
export const dictionaries = { en, id } satisfies Record<string, Dictionary>;

export type Locale = keyof typeof dictionaries;

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "orca.locale";

/** Each language is shown in its own name, so people can find it even if the UI is unreadable. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  id: "Bahasa Indonesia",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && value in dictionaries;
}

/** "id", "id-ID" -> Indonesian; anything else -> English. */
export function detectLocale(browserLanguage: string | undefined): Locale {
  return browserLanguage?.toLowerCase().startsWith("id") ? "id" : DEFAULT_LOCALE;
}

/** Fills `{name}` placeholders in a dictionary string: fill("Due in {n} days", { n: 3 }). */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** Formats "YYYY-MM-DD" (or a Date) for display, e.g. "Fri, 16 Oct" / "Jum, 16 Okt". */
export function formatDate(value: string | Date, locale: Locale): string {
  let date: Date;
  if (typeof value === "string") {
    // A date-only string is a calendar day in the user's own time. new Date("YYYY-MM-DD")
    // would read it as UTC and can show the previous day.
    const [year, month, day] = value.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = value;
  }
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}
