import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { HeavyLoad, ScheduledTask } from "@/lib/schedule";

import { HeavyLoadNotice } from "./HeavyLoadNotice";

const load: HeavyLoad = {
  is_heavy: true,
  reason: "over_capacity",
  total_minutes: 300,
  capacity_minutes: 240,
};

const suggestion: ScheduledTask = {
  id: "t1",
  title: "Clean the garage",
  due_date: null,
  estimated_minutes: 120,
  impact_score: 1,
  status: "todo",
  priority_score: 2,
  priority_label: "whenever",
  reasons: [],
};

describe("HeavyLoadNotice", () => {
  it("explains a full day gently, with the numbers", () => {
    render(<HeavyLoadNotice load={load} suggestion={suggestion} onMove={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "A full day" })).toBeInTheDocument();
    expect(screen.getByText(/more than a comfortable day/)).toBeInTheDocument();
    expect(screen.getByText("About 300 minutes planned, for a 240-minute day.")).toBeInTheDocument();
    expect(screen.getByText("Clean the garage")).toBeInTheDocument();
  });

  it.each([
    ["lowest_priority", "It ranks lowest among today's tasks."],
    ["past_its_date", "It's already past its date"],
  ] as const)("says why it suggests that task (%s)", (reason, text) => {
    render(<HeavyLoadNotice load={load} suggestion={suggestion} reason={reason} onMove={vi.fn()} />);

    expect(screen.getByText(new RegExp(text))).toBeInTheDocument();
  });

  it("only suggests at first: 'Move it' asks for a yes before anything moves", async () => {
    const onMove = vi.fn();
    render(<HeavyLoadNotice load={load} suggestion={suggestion} onMove={onMove} />);

    await userEvent.click(screen.getByRole("button", { name: "Move it" }));

    expect(screen.getByText(/Move “Clean the garage” to tomorrow/)).toBeInTheDocument();
    expect(onMove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Yes, move it" }));
    expect(onMove).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenCalledWith(suggestion);
    expect(screen.getByRole("button", { name: "Move it" })).toBeInTheDocument();
  });

  it("moves nothing when the person cancels the review", async () => {
    const onMove = vi.fn();
    render(<HeavyLoadNotice load={load} suggestion={suggestion} onMove={onMove} />);

    await userEvent.click(screen.getByRole("button", { name: "Move it" }));
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onMove).not.toHaveBeenCalled();
    expect(screen.queryByText(/to tomorrow/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move it" })).toBeInTheDocument();
  });

  it("uses the long-tasks wording for that reason", () => {
    render(
      <HeavyLoadNotice
        load={{ ...load, reason: "many_long_tasks" }}
        suggestion={null}
        onMove={vi.fn()}
      />,
    );

    expect(screen.getByText(/several long tasks/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move it" })).not.toBeInTheDocument();
  });
});
