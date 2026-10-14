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
  it("explains a full day gently and offers to move the suggested task", async () => {
    const onMove = vi.fn();
    render(<HeavyLoadNotice load={load} suggestion={suggestion} onMove={onMove} />);

    expect(screen.getByRole("heading", { name: "A full day" })).toBeInTheDocument();
    expect(screen.getByText(/more than a comfortable day/)).toBeInTheDocument();
    expect(screen.getByText("Clean the garage")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Move it" }));
    expect(onMove).toHaveBeenCalledWith(suggestion);
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
