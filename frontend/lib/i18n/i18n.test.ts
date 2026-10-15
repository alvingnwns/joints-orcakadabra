import { describe, expect, it } from "vitest";

import { en } from "./en";
import { detectLocale, dictionaries, fill, formatDate } from "./index";

describe("dictionaries", () => {
  it.each(Object.keys(dictionaries))("%s has exactly the same keys as English", (code) => {
    const dictionary = dictionaries[code as keyof typeof dictionaries];

    expect(Object.keys(dictionary).sort()).toEqual(Object.keys(en).sort());
  });

  it.each(Object.keys(dictionaries))("%s has no empty strings", (code) => {
    const dictionary = dictionaries[code as keyof typeof dictionaries];

    expect(Object.values(dictionary).every((text) => text.trim().length > 0)).toBe(true);
  });

  it.each(Object.keys(dictionaries))("%s uses the same {placeholders} as English", (code) => {
    const dictionary = dictionaries[code as keyof typeof dictionaries];
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(dictionary[key]), key).toEqual(placeholders(en[key]));
    }
  });
});

describe("fill", () => {
  it("replaces named placeholders, including repeats", () => {
    expect(fill("{a} and {b} and {a}", { a: "x", b: 2 })).toBe("x and 2 and x");
  });

  it("leaves an unknown placeholder visible rather than printing 'undefined'", () => {
    expect(fill("Hello {name}", {})).toBe("Hello {name}");
  });
});

describe("detectLocale", () => {
  it("maps Indonesian browser languages to id and everything else to en", () => {
    expect(detectLocale("id")).toBe("id");
    expect(detectLocale("id-ID")).toBe("id");
    expect(detectLocale("en-US")).toBe("en");
    expect(detectLocale("fr")).toBe("en");
    expect(detectLocale(undefined)).toBe("en");
  });
});

describe("formatDate", () => {
  it("formats a calendar date without shifting the day", () => {
    expect(formatDate("2026-10-16", "en")).toContain("16");
    expect(formatDate("2026-10-16", "id")).toContain("16");
  });

  it("uses the language of the active locale", () => {
    expect(formatDate("2026-10-16", "en")).toContain("Oct");
    expect(formatDate("2026-10-16", "id")).toContain("Okt");
  });
});
