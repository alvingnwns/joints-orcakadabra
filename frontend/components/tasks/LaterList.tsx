"use client";

import { useT } from "@/components/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/en";
import type { Task } from "@/lib/tasks";

import type { UpdateTask } from "./TaskActions";
import { TaskItem } from "./TaskItem";

type Props = {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onUpdate: UpdateTask;
  /** Also used for the collapsed "Done today" list. */
  titleKey?: TranslationKey;
};

/** Tasks saved for later (status "deferred", C3). Collapsed by default so they stay out of the way. */
export function LaterList({ tasks, titleKey = "laterTitle", ...handlers }: Props) {
  const t = useT();
  if (tasks.length === 0) return null;

  return (
    <details className="rounded-card bg-surface/60 p-4">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium">
        {t(titleKey)} ({tasks.length})
      </summary>
      <ul className="mt-3 space-y-3">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} {...handlers} />
        ))}
      </ul>
    </details>
  );
}
