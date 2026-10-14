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

async function openMenu() {
  await userEvent.click(screen.getByRole("button", { name: "Change plans" }));
}

describe("localDate", () => {
  it("uses the local calendar day and rolls over months", () => {
    const now = new Date(2026, 9, 31, 23, 30); // 31 Oct, late evening
    expect(localDate(0, now)).toBe("2026-10-31");
    expect(localDate(1, now)).toBe("2026-11-01");
  });
});

describe("TaskActions", () => {
  it("opens and closes the menu, with aria-expanded", async () => {
    render(<TaskActions task={task} onUpdate={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Change plans" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await openMenu();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Move to tomorrow" })).toBeInTheDocument();
  });

  it("moves to tomorrow and returns focus to the trigger", async () => {
    const onUpdate = vi.fn();
    render(<TaskActions task={task} onUpdate={onUpdate} />);

    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Move to tomorrow" }));

    expect(onUpdate).toHaveBeenCalledWith(task, { due_date: localDate(1) }, "movedTomorrow");
    expect(screen.getByRole("button", { name: "Change plans" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Move to tomorrow" })).not.toBeInTheDocument();
  });

  it("picks another day", async () => {
    const onUpdate = vi.fn();
    render(<TaskActions task={task} onUpdate={onUpdate} />);

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
    const onUpdate = vi.fn();
    render(<TaskActions task={task} onUpdate={onUpdate} />);

    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Not today, save for later" }));

    expect(onUpdate).toHaveBeenCalledWith(task, { status: "deferred" }, "movedLater");
  });

  it("makes a task smaller, and can clear the estimate", async () => {
    const onUpdate = vi.fn();
    render(<TaskActions task={task} onUpdate={onUpdate} />);

    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Make it smaller" }));
    const title = screen.getByLabelText("A smaller version of this task");
    expect(title).toHaveValue("Write the whole report");

    await userEvent.clear(title);
    await userEvent.type(title, "  Write the intro ");
    await userEvent.clear(screen.getByLabelText(/Time needed/));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onUpdate).toHaveBeenCalledWith(
      task,
      { title: "Write the intro", estimated_minutes: null },
      "madeSmaller",
    );
  });

  it("does not save an empty smaller title, and Cancel goes back to the menu", async () => {
    const onUpdate = vi.fn();
    render(<TaskActions task={task} onUpdate={onUpdate} />);

    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Make it smaller" }));
    await userEvent.clear(screen.getByLabelText("A smaller version of this task"));

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Make it smaller" })).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("offers only 'Bring back' for a task saved for later", async () => {
    const onUpdate = vi.fn();
    const deferred = { ...task, status: "deferred" as const };
    render(<TaskActions task={deferred} onUpdate={onUpdate} />);

    expect(screen.queryByRole("button", { name: "Change plans" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Bring back" }));

    expect(onUpdate).toHaveBeenCalledWith(deferred, { status: "todo" }, "broughtBack");
  });

  it("shows nothing for a done task", () => {
    const { container } = render(
      <TaskActions task={{ ...task, status: "done" }} onUpdate={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
