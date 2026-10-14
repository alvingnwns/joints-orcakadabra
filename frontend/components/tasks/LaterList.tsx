"use client";

import { useT } from "@/components/LocaleProvider";
import type { Task } from "@/lib/tasks";

import type { UpdateTask } from "./TaskActions";
import { TaskItem } from "./TaskItem";

type Props = {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onUpdate: UpdateTask;
};

/** Tasks saved for later (status "deferred", C3). Collapsed by default so they stay out of the way. */
export function LaterList({ tasks, ...handlers }: Props) {
  const t = useT();
  if (tasks.length === 0) return null;

  return (
    <details className="rounded-card bg-surface/60 p-4">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium">
        {t("laterTitle")} ({tasks.length})
      </summary>
      <ul className="mt-3 space-y-3">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} {...handlers} />
        ))}
      </ul>
    </details>
  );
}
