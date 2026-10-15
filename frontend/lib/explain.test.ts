import { describe, expect, it } from "vitest";

import { en } from "@/lib/i18n/en";
import { id } from "@/lib/i18n/id";
import { type Task, daysBetween, localDate } from "@/lib/tasks";

import { isNotDueToday, taskReasons } from "./explain";

const task: Task = {
  id: "t1",
  title: "Report",
  due_date: null,
  estimated_minutes: null,
  impact_score: 3,
  status: "todo",
};
const today = "2026-10-15";
const english = (key: keyof typeof en) => en[key];

describe("daysBetween", () => {
  it("counts calendar days, across months and in either direction", () => {
    expect(daysBetween("2026-10-15", "2026-10-15")).toBe(0);
    expect(daysBetween("2026-10-15", "2026-10-16")).toBe(1);
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(daysBetween("2026-10-15", "2026-10-12")).toBe(-3);
  });

  it("is not thrown off by a daylight-saving change", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });

  it("agrees with localDate", () => {
    expect(daysBetween(localDate(0), localDate(7))).toBe(7);
  });
});

describe("taskReasons", () => {
  it.each([
    ["2026-10-13", "Past its date"],
    ["2026-10-15", "Due today"],
    ["2026-10-16", "Due tomorrow"],
    ["2026-10-20", "Due in 5 days"],
    [null, "No due date"],
  ])("describes a due date of %s", (due_date, text) => {
    expect(taskReasons({ ...task, due_date }, today, english)[0]).toBe(text);
  });

  it.each([
    [1, "You marked it as a small deal"],
    [2, "You marked it as a small deal"],
    [3, "You marked it as something that matters"],
    [4, "You marked it as really mattering"],
    [5, "You marked it as really mattering"],
  ])("describes importance %i", (impact_score, text) => {
    expect(taskReasons({ ...task, impact_score }, today, english)[1]).toBe(text);
  });

  it("mentions length only past two hours", () => {
    expect(taskReasons({ ...task, estimated_minutes: 120 }, today, english)).toHaveLength(2);
    expect(taskReasons({ ...task, estimated_minutes: 121 }, today, english)).toHaveLength(3);
  });

  it("speaks Indonesian when given the Indonesian dictionary", () => {
    const indonesian = (key: keyof typeof id) => id[key];

    expect(taskReasons({ ...task, due_date: "2026-10-16", impact_score: 5 }, today, indonesian)).toEqual(
      ["Tenggat besok", "Kamu menandainya sebagai sangat penting"],
    );
  });
});

describe("isNotDueToday", () => {
  it("is true for a later date or no date, false for today or earlier", () => {
    expect(isNotDueToday({ ...task, due_date: "2026-10-16" }, today)).toBe(true);
    expect(isNotDueToday({ ...task, due_date: null }, today)).toBe(true);
    expect(isNotDueToday({ ...task, due_date: "2026-10-15" }, today)).toBe(false);
    expect(isNotDueToday({ ...task, due_date: "2026-10-01" }, today)).toBe(false);
  });
});
