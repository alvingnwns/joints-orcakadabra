import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { type Task, localDate } from "@/lib/tasks";

import { TaskActions } from "./TaskActions";

const task: Task = {
  id: "t1",
  title: "Write the whole report",
  due_date: null,
  estimated_minutes: 180,
  impact_score: 3,
  status: "todo",
};

function renderActions(item: Task = task) {
  const handlers = {
    onUpdate: vi.fn(),
    onEdit: vi.fn().mockResolvedValue(true),
    onDelete: vi.fn(),
  };
  render(<TaskActions task={item} {...handlers} />);
  return handlers;
}

const more = () => screen.getByRole("button", { name: "More" });
const openMenu = () => userEvent.click(more());

describe("localDate", () => {
  it("uses the local calendar day and rolls over months", () => {
    const now = new Date(2026, 9, 31, 23, 30); // 31 Oct, late evening
    expect(localDate(0, now)).toBe("2026-10-31");
    expect(localDate(1, now)).toBe("2026-11-01");
  });
});

describe("TaskActions", () => {
  it("opens and closes the menu, with aria-expanded", async () => {
    renderActions();

    expect(more()).toHaveAttribute("aria-expanded", "false");
    await openMenu();
    expect(more()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Move to tomorrow" })).toBeInTheDocument();

    await openMenu();
    expect(more()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Edit details" })).not.toBeInTheDocument();
  });

  it("offers edit, move, later and delete for an active task", async () => {
    renderActions();

    await openMenu();

    for (const name of [
      "Edit details",
      "Move to tomorrow",
      "Pick another day",
      "Not today, save for later",
      "Delete",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("moves to tomorrow and returns focus to the menu button", async () => {
    const { onUpdate } = renderActions();

    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Move to tomorrow" }));

    expect(onUpdate).toHaveBeenCalledWith(task, { due_date: localDate(1) }, "movedTomorrow");
    expect(more()).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Move to tomorrow" })).not.toBeInTheDocument();
  });

  it("picks another day", async () => {
    const { onUpdate } = renderActions();

    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Pick another day" }));
    const input = screen.getByLabelText("New day");
    expect(input).toHaveFocus();
    expect(input).toHaveValue(localDate(1)); // no date yet: suggests tomorrow

    await userEvent.clear(input);
    await userEvent.type(input, "2030-01-15");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onUpdate).toHaveBeenCalledWith(task, { due_date: "2030-01-15" }, "movedDay");
  });

  it("saves for later", async () => {
    const { onUpdate } = renderActions();

    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Not today, save for later" }));

    expect(onUpdate).toHaveBeenCalledWith(task, { status: "deferred" }, "movedLater");
  });

  it("keeps 'Bring back' in sight for a task saved for later, without move options", async () => {
    const deferred = { ...task, status: "deferred" as const };
    const { onUpdate } = renderActions(deferred);

    await userEvent.click(screen.getByRole("button", { name: "Bring back" }));
    expect(onUpdate).toHaveBeenCalledWith(deferred, { status: "todo" }, "broughtBack");

    await openMenu();
    expect(screen.getByRole("button", { name: "Edit details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move to tomorrow" })).not.toBeInTheDocument();
  });

  it("lets a done task be edited or deleted, but not moved", async () => {
    renderActions({ ...task, status: "done" });

    expect(screen.queryByRole("button", { name: "Bring back" })).not.toBeInTheDocument();
    await openMenu();

    expect(screen.getByRole("button", { name: "Edit details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move to tomorrow" })).not.toBeInTheDocument();
  });

  it("opens the edit dialog, and cancelling without changes closes it and returns focus", async () => {
    const { onEdit } = renderActions();

    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Edit details" }));
    expect(screen.getByRole("dialog", { name: "Edit task" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit details" })).toHaveFocus();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("names the task before deleting, and 'Keep it' cancels", async () => {
    const { onDelete } = renderActions();

    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = screen.getByRole("dialog", { name: "Delete this task?" });
    expect(dialog).toHaveTextContent("“Write the whole report” will be removed");
    expect(screen.getByRole("button", { name: "Keep it" })).toHaveFocus();
    expect(onDelete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Keep it" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
  });

  it("deletes only after confirming", async () => {
    const { onDelete } = renderActions();

    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, delete" }));

    expect(onDelete).toHaveBeenCalledWith(task);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
