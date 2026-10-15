import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/** Reads the --color-* tokens straight from globals.css, so the test cannot drift from the app. */
function readTokens(css: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const match of css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})\b/gi)) {
    tokens[match[1]] = match[2].toLowerCase();
  }
  return tokens;
}

const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
const DARK_START = css.indexOf('html[data-theme="dark"] {');
const light = readTokens(css.slice(0, DARK_START));
// The dark theme only re-assigns names, so anything it does not mention keeps its light value.
const dark = { ...light, ...readTokens(css.slice(DARK_START)) };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

// [foreground, background, minimum ratio]. 4.5 for text, 3 for icons and control outlines.
// The same pairs are checked for both themes.
const PAIRS: [string, string, number][] = [
  ["text", "background", 4.5],
  ["text", "surface", 4.5],
  ["text", "surface-muted", 4.5],
  ["text", "primary-soft", 4.5],
  ["text", "danger-soft", 4.5],
  ["text-secondary", "background", 4.5],
  ["text-secondary", "surface", 4.5],
  ["text-secondary", "surface-muted", 4.5],
  ["text-secondary", "primary-soft", 4.5],
  ["on-primary", "primary", 4.5],
  ["on-primary", "primary-hover", 4.5],
  ["on-primary", "danger", 4.5],
  ["on-primary", "danger-hover", 4.5],
  ["on-primary", "text", 4.5], // toast: light text on the dark surface
  ["primary", "background", 4.5], // primary used as text
  ["primary", "surface", 4.5],
  ["primary", "primary-soft", 4.5],
  ["attention-text", "attention", 4.5],
  ["attention-text", "background", 4.5],
  ["danger-text", "danger-soft", 4.5],
  ["danger-text", "surface", 4.5],
  ["danger", "danger-soft", 3], // danger icon on its soft surface
  ["focus", "background", 3],
  ["focus", "surface", 3],
  ["on-primary", "text", 3], // focus ring on the dark toast
  ["border-strong", "background", 3],
  ["border-strong", "surface", 3],
  ["border-strong", "surface-muted", 3],
  // Status colors: the word on its badge and tint, and the stripe/bar against the white card.
  ["soon-text", "soon-badge", 4.5],
  ["soon-text", "soon-soft", 4.5],
  ["soon", "surface", 3],
  ["whenever-text", "whenever-badge", 4.5],
  ["whenever-text", "whenever-soft", 4.5],
  ["whenever", "surface", 3],
  ["later-text", "later-badge", 4.5],
  ["later-text", "later-soft", 4.5],
  ["later", "surface", 3],
  ["done-text", "done-badge", 4.5],
  ["done", "surface", 3],
  ["warm-text", "warm-soft", 4.5],
  ["warm", "surface", 3],
  ["text-secondary", "warm-soft", 4.5],
  ["text-secondary", "soon-soft", 4.5],
  ["text", "wash", 4.5],
  ["text-secondary", "wash", 4.5],
  ["primary", "wash", 4.5],
];

describe.each([
  ["light", light],
  ["dark", dark],
] as const)("design tokens (%s theme)", (_name, tokens) => {
  it("are all read from globals.css", () => {
    for (const [fg, bg] of PAIRS) {
      expect(tokens[fg], `--color-${fg}`).toBeDefined();
      expect(tokens[bg], `--color-${bg}`).toBeDefined();
    }
  });

  it.each(PAIRS)("%s on %s meets %s:1", (fg, bg, minimum) => {
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(minimum);
  });
});

describe("dark theme", () => {
  it("redefines every color token the light theme has, so nothing stays light by accident", () => {
    const missing = Object.keys(light).filter(
      (name) => readTokens(css.slice(DARK_START))[name] === undefined,
    );

    expect(missing).toEqual([]);
  });

  it("is a real change, not a copy of the light colors", () => {
    expect(dark.background).not.toBe(light.background);
    expect(dark.text).not.toBe(light.text);
    expect(contrast(dark.background, dark.text)).toBeGreaterThan(10);
  });
});
