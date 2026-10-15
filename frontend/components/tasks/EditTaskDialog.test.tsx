import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Task, TaskChanges } from "@/lib/tasks";

import { EditTaskDialog } from "./EditTaskDialog";

const task: Task = {
  id: "t1",
  title: "Write report",
  description: "Quarterly numbers",
  due_date: "2026-10-16",
  estimated_minutes: 90,
  impact_score: 3,
  status: "todo",
};

const title = () => screen.getByLabelText("Task");
const notes = () => screen.getByLabelText("Notes (optional)");
const due = () => screen.getByLabelText("Due date (optional)");
const minutes = () => screen.getByLabelText("Time needed, in minutes (optional)");

function renderDialog(onSave: (changes: TaskChanges) => Promise<boolean> = async () => true) {
  const onClose = vi.fn();
  const save = vi.fn(onSave);
  render(<EditTaskDialog task={task} onSave={save} onClose={onClose} />);
  return { onClose, save };
}

describe("EditTaskDialog", () => {
  it("starts from the task's current details", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Edit task" })).toBeInTheDocument();
    expect(title()).toHaveValue("Write report");
    expect(notes()).toHaveValue("Quarterly numbers");
    expect(due()).toHaveValue("2026-10-16");
    expect(minutes()).toHaveValue(90);
    expect(screen.getByLabelText("Matters")).toBeChecked();
  });

  it("saves only what changed, with a trimmed title", async () => {
    const { save, onClose } = renderDialog();

    await userEvent.clear(title());
    await userEvent.type(title(), "  Write the intro ");
    await userEvent.click(screen.getByLabelText("Really matters"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(save).toHaveBeenCalledWith({ title: "Write the intro", impact_score: 5 });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("can clear the notes, the date and the estimate", async () => {
    const { save } = renderDialog();

    await userEvent.clear(notes());
    await userEvent.click(screen.getByRole("button", { name: "Remove date" }));
    await userEvent.clear(minutes());
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(save).toHaveBeenCalledWith({
      description: null,
      due_date: null,
      estimated_minutes: null,
    });
  });

  it("only offers 'Remove date' when there is a date", async () => {
    renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Remove date" }));

    expect(due()).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Remove date" })).not.toBeInTheDocument();
  });

  it("does not save an empty title, and says why", async () => {
    const { save } = renderDialog();

    await userEvent.clear(title());
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(save).not.toHaveBeenCalled();
    expect(title()).toBeInvalid();
    expect(screen.getByRole("alert")).toHaveTextContent("Please give the task a name.");
  });

  it.each(["3", "800", "12.5"])("does not save a time of %s minutes", async (value) => {
    const { save } = renderDialog();

    await userEvent.clear(minutes());
    await userEvent.type(minutes(), value);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("between 5 and 720 minutes");
  });

  it("just closes when nothing changed", async () => {
    const { save, onClose } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(save).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the form and shows a calm error when saving fails, then can try again", async () => {
    const results = [false, true];
    const { save, onClose } = renderDialog(async () => results.shift()!);

    await userEvent.clear(title());
    await userEvent.type(title(), "Write the intro");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't save your changes");
    expect(title()).toHaveValue("Write the intro");
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(save).toHaveBeenCalledTimes(2);
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("blocks repeated saves while one is running", async () => {
    let finish: (saved: boolean) => void = () => {};
    const { save } = renderDialog(() => new Promise<boolean>((resolve) => (finish = resolve)));

    await userEvent.type(title(), " now");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    finish(true);
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
  });

  it("asks before throwing away changes, and 'Keep editing' goes back", async () => {
    const { save, onClose } = renderDialog();

    await userEvent.type(title(), " (draft)");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Discard your changes?")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(screen.queryByText("Discard your changes?")).not.toBeInTheDocument();
    expect(title()).toHaveValue("Write report (draft)");
    expect(save).not.toHaveBeenCalled();
  });

  it("discards the changes only when asked to", async () => {
    const { save, onClose } = renderDialog();

    await userEvent.type(title(), " (draft)");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled();
  });
});
