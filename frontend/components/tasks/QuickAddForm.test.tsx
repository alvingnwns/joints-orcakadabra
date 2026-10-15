import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuickAddForm } from "./QuickAddForm";

const addButton = () => screen.getByRole("button", { name: "Add" });
const titleInput = () => screen.getByLabelText("What's one thing to do?");

describe("QuickAddForm", () => {
  it("cannot be submitted without a title", async () => {
    render(<QuickAddForm onAdd={vi.fn()} />);
    expect(addButton()).toBeDisabled();

    await userEvent.type(titleInput(), "   ");
    expect(addButton()).toBeDisabled();
  });

  it("sends just the title with the default impact, then clears and refocuses", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<QuickAddForm onAdd={onAdd} />);

    await userEvent.type(titleInput(), "  Buy milk ");
    await userEvent.click(addButton());

    expect(onAdd).toHaveBeenCalledWith({ title: "Buy milk", impact_score: 3 });
    expect(titleInput()).toHaveValue("");
    expect(titleInput()).toHaveFocus();
  });

  it("works from the keyboard with Enter", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<QuickAddForm onAdd={onAdd} />);

    await userEvent.type(titleInput(), "Call the bank{Enter}");

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("sends the optional details when they are filled in", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<QuickAddForm onAdd={onAdd} />);

    await userEvent.type(titleInput(), "Finish proposal");
    await userEvent.click(screen.getByText("More details"));
    await userEvent.type(screen.getByLabelText("Notes (optional)"), "  Use the new template ");
    await userEvent.type(screen.getByLabelText("Due date (optional)"), "2026-10-16");
    await userEvent.type(screen.getByLabelText("Time needed, in minutes (optional)"), "90");
    await userEvent.click(screen.getByLabelText("Really matters"));
    await userEvent.click(addButton());

    expect(onAdd).toHaveBeenCalledWith({
      title: "Finish proposal",
      impact_score: 5,
      description: "Use the new template",
      due_date: "2026-10-16",
      estimated_minutes: 90,
    });
  });

  it("keeps what was typed and shows a calm message when saving fails", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("network"));
    render(<QuickAddForm onAdd={onAdd} />);

    await userEvent.type(titleInput(), "Book flights");
    await userEvent.click(addButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("still here");
    expect(titleInput()).toHaveValue("Book flights");
    expect(addButton()).toBeEnabled();
  });
});
