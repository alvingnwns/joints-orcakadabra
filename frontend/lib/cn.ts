/** Joins class names, skipping falsy values. Callers must not pass conflicting utilities. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
