import { describe, expect, it } from "vitest";

import { en } from "@/lib/i18n/en";
import { id } from "@/lib/i18n/id";

import { BUSY_RATIO, formatDuration, loadLevel } from "./load";

describe("loadLevel", () => {
  it("is 'none' for an empty day, whatever the capacity", () => {
    expect(loadLevel(0, 240, false)).toBe("none");
    expect(loadLevel(0, 30, true)).toBe("none");
  });

  it("is 'light' below three quarters of the capacity", () => {
    expect(loadLevel(30, 240, false)).toBe("light");
    expect(loadLevel(179, 240, false)).toBe("light");
  });

  it("warns 'busy' from three quarters of the capacity, before the day is actually full", () => {
    expect(BUSY_RATIO).toBe(0.75);
    expect(loadLevel(180, 240, false)).toBe("busy");
    expect(loadLevel(240, 240, false)).toBe("busy"); // exactly full is not over capacity
  });

  it("is 'full' whenever the backend says the day is heavy", () => {
    expect(loadLevel(300, 240, true)).toBe("full");
    expect(loadLevel(60, 240, true)).toBe("full"); // e.g. too many long tasks
  });

  it("scales with the person's own capacity", () => {
    expect(loadLevel(180, 480, false)).toBe("light");
    expect(loadLevel(180, 240, false)).toBe("busy");
  });
});

describe("formatDuration", () => {
  const english = (key: keyof typeof en) => en[key];
  const indonesian = (key: keyof typeof id) => id[key];

  it.each([
    [5, "5 min"],
    [45, "45 min"],
    [60, "1 h"],
    [240, "4 h"],
    [270, "4 h 30 min"],
    [720, "12 h"],
  ])("writes %i minutes as '%s'", (minutes, text) => {
    expect(formatDuration(minutes, english)).toBe(text);
  });

  it("uses the other language's units", () => {
    expect(formatDuration(270, indonesian)).toBe("4 j 30 mnt");
  });
});

describe("strings changed in this update", () => {
  it("calls the week 'Minggu Ini' in Indonesian", () => {
    expect(id.weekTitle).toBe("Minggu Ini");
    expect(id.navWeek).toBe("Minggu ini");
  });

  it("calls the task menu 'Action' / 'Aksi'", () => {
    expect(en.moreActions).toBe("Action");
    expect(id.moreActions).toBe("Aksi");
  });

  it("warns 'Almost full' before 'Full day'", () => {
    expect(en.loadBusy).toBe("Almost full");
    expect(id.loadBusy).toBe("Hampir penuh");
  });
});
