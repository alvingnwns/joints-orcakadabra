"use client";

import { useT } from "@/components/LocaleProvider";
import { type EditTask, type UpdateTask } from "@/components/tasks/TaskActions";
import { TaskItem } from "@/components/tasks/TaskItem";
import { isNotDueToday } from "@/lib/explain";
import type { ScheduledTask } from "@/lib/schedule";
import { type Task, localDate } from "@/lib/tasks";

type Props = {
  task: ScheduledTask;
  first: boolean;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onUpdate: UpdateTask;
  onEdit: EditTask;
};

/**
 * One of the top 3 "Start here" tasks. A pick that is not due today says so, instead of leaving
 * it to look like a mistake. ("Why is this here?" comes with every ranked task, see TaskItem.)
 */
export function FocusCard({ first, ...props }: Props) {
  const t = useT();

  return (
    <TaskItem {...props} emphasis={first}>
      {isNotDueToday(props.task, localDate(0)) && (
        <p className="mt-3 text-sm text-text-secondary">{t("notDueTodayNote")}</p>
      )}
    </TaskItem>
  );
}
