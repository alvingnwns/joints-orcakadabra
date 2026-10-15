"use client";

import { CircleQuestionMark } from "lucide-react";

import { useAskChat } from "@/components/chat/ChatPanel";
import { useT } from "@/components/LocaleProvider";
import { type EditTask, type UpdateTask } from "@/components/tasks/TaskActions";
import { TaskItem } from "@/components/tasks/TaskItem";
import { Button } from "@/components/ui/Button";
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
 * it to look like a mistake. "Why is this here?" opens the chat for this task.
 */
export function FocusCard({ first, ...props }: Props) {
  const t = useT();
  const askChat = useAskChat();

  return (
    <TaskItem {...props} emphasis={first}>
      {isNotDueToday(props.task, localDate(0)) && (
        <p className="mt-3 text-sm text-text-secondary">{t("notDueTodayNote")}</p>
      )}
      <Button
        variant="quiet"
        icon={CircleQuestionMark}
        aria-haspopup="dialog"
        onClick={() => askChat(`${t("chatWhy")} (${props.task.title})`, props.task.id)}
        className="mt-3"
      >
        {t("chatWhy")}
        <span className="sr-only"> ({props.task.title})</span>
      </Button>
    </TaskItem>
  );
}
