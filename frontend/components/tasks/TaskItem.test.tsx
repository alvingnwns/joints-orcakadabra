import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { type Task, localDate } from "@/lib/tasks";

import { TaskItem } from "./TaskItem";

const task: Task = {
  id: "t1",
  title: "Write report",
  due_date: "2026-10-16",
  estimated_minutes: 90,
  impact_score: 3,
  status: "todo",
};

function renderItem(item: Parameters<typeof TaskItem>[0]["task"] = task, onToggle = vi.fn()) {
  const handlers = { onDelete: vi.fn(), onUpdate: vi.fn(), onEdit: vi.fn().mockResolvedValue(true) };
  const view = render(<TaskItem task={item} onToggle={onToggle} {...handlers} />);
  return { ...handlers, onToggle, ...view };
}

describe("TaskItem", () => {
  it("shows the title, due date and estimate", () => {
    renderItem();

    expect(screen.getByRole("checkbox", { name: "Write report" })).not.toBeChecked();
    expect(screen.getByText(/^Due .*16/)).toBeInTheDocument();
    expect(screen.getByText("90 min")).toBeInTheDocument();
  });

  it("marks a task done and undone through the checkbox", async () => {
    const { onToggle, rerender, onDelete, onUpdate, onEdit } = renderItem();

    await userEvent.click(screen.getByRole("checkbox", { name: "Write report" }));
    expect(onToggle).toHaveBeenCalledWith(task);

    rerender(
      <TaskItem
        task={{ ...task, status: "done" }}
        onToggle={onToggle}
        onDelete={onDelete}
        onUpdate={onUpdate}
        onEdit={onEdit}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Write report" })).toBeChecked();
  });

  it("shows the notes, kept short", () => {
    renderItem({ ...task, description: "Quarterly numbers for finance" });

    const notes = screen.getByText("Quarterly numbers for finance");
    expect(notes).toBeVisible();
    expect(notes).toHaveClass("line-clamp-2");
  });

  it("labels a ranked task and says why in plain words", () => {
    renderItem({
      ...task,
      due_date: localDate(1),
      impact_score: 5,
      estimated_minutes: 180,
      priority_label: "focus",
    });

    expect(screen.getByText("Focus")).toBeInTheDocument();
    expect(
      screen.getByText("Due tomorrow · You marked it as really mattering · Needs more than 2 hours"),
    ).toBeInTheDocument();
  });

  it.each([
    [localDate(0), "Due today"],
    [localDate(-3), "Past its date"],
    [localDate(5), "Due in 5 days"],
    [null, "No due date"],
  ])("explains a date of %s as '%s'", (due_date, phrase) => {
    renderItem({ ...task, due_date, priority_label: "soon" });

    expect(screen.getByText(new RegExp(`^${phrase} · You marked it as something that matters`)))
      .toBeInTheDocument();
    expect(screen.getByText("Soon")).toBeInTheDocument();
  });

  it("shows neither label nor reasons for a task the backend has not ranked", () => {
    renderItem({ ...task, due_date: localDate(1) });

    expect(screen.queryByText("Focus")).not.toBeInTheDocument();
    expect(screen.queryByText(/You marked it/)).not.toBeInTheDocument();
  });

  it("offers 'Why is this here?' on every ranked task, and not on unranked ones", () => {
    const { unmount } = renderItem({ ...task, priority_label: "whenever" });
    expect(
      screen.getByRole("button", { name: /^Why is this here\?\s*\(Write report\)$/ }),
    ).toBeInTheDocument();
    unmount();

    renderItem(task);
    expect(screen.queryByRole("button", { name: /Why is this here/ })).not.toBeInTheDocument();
  });

  it.each([
    ["focus", "Focus", "bg-primary", "bg-primary text-on-primary"],
    ["soon", "Soon", "bg-soon", "bg-soon-badge"],
    ["whenever", "Whenever", "bg-whenever", "bg-whenever-badge"],
  ] as const)(
    "gives a %s task its own color, word and edge so the three are easy to tell apart",
    (label, word, edge, badge) => {
      const { container } = renderItem({ ...task, priority_label: label });

      const pill = screen.getByText(word);
      expect(pill).toHaveClass(...badge.split(" "));
      expect(pill.querySelector("svg")).not.toBeNull(); // an icon too, never color alone
      expect(container.querySelector("li > span[aria-hidden]")).toHaveClass(edge);
    },
  );

  it("marks a task saved for later in lilac and a finished one in sage", () => {
    const { container, unmount } = renderItem({ ...task, status: "deferred" });
    expect(screen.getByText("Later")).toHaveClass("bg-later-badge");
    expect(container.querySelector("li > span[aria-hidden]")).toHaveClass("bg-later");
    unmount();

    const done = renderItem({ ...task, status: "done" });
    expect(screen.getByText("Done")).toHaveClass("bg-done-badge");
    expect(done.container.querySelector("li > span[aria-hidden]")).toHaveClass("bg-done");
  });

  it("shows the due date and the time as separate chips", () => {
    renderItem({ ...task, priority_label: "soon" });

    expect(screen.getByText(/^Due .*16/)).toHaveClass("rounded-full");
    expect(screen.getByText("90 min")).toHaveClass("rounded-full");
  });

  it("has no always-visible Delete button; delete lives in the Action menu", async () => {
    renderItem();

    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Action" }));
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});
