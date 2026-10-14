"use client";

import { type UpdateTask } from "@/components/tasks/TaskActions";
import { TaskItem } from "@/components/tasks/TaskItem";
import type { ScheduledTask } from "@/lib/schedule";
import type { Task } from "@/lib/tasks";

type Props = {
  task: ScheduledTask;
  first: boolean;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onUpdate: UpdateTask;
};

/** One of the top 3 "Start here" tasks. CP15 adds a "Why is this here?" link. */
export function FocusCard({ first, ...props }: Props) {
  return <TaskItem {...props} emphasis={first} />;
}
