import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Task } from "@/lib/tasks";

import { TaskItem } from "./TaskItem";

const task: Task = {
  id: "t1",
  title: "Write report",
  due_date: "2026-10-16",
  estimated_minutes: 90,
  impact_score: 3,
  status: "todo",
};

describe("TaskItem", () => {
  it("shows the title, due date and estimate", () => {
    render(<TaskItem task={task} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByLabelText(/Write report/)).not.toBeChecked();
    expect(screen.getByText(/Due .*16/)).toHaveTextContent("90 min");
  });

  it("marks a task done and undone through the checkbox", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<TaskItem task={task} onToggle={onToggle} onDelete={vi.fn()} />);

    await userEvent.click(screen.getByLabelText(/Write report/));
    expect(onToggle).toHaveBeenCalledWith(task);

    rerender(<TaskItem task={{ ...task, status: "done" }} onToggle={onToggle} onDelete={vi.fn()} />);
    expect(screen.getByLabelText(/Write report/)).toBeChecked();
  });

  it("asks before deleting, and 'Keep it' cancels", async () => {
    const onDelete = vi.fn();
    render(<TaskItem task={task} onToggle={vi.fn()} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Keep it" })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("deletes only after confirming", async () => {
    const onDelete = vi.fn();
    render(<TaskItem task={task} onToggle={vi.fn()} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, delete" }));

    expect(onDelete).toHaveBeenCalledWith(task);
  });
});
