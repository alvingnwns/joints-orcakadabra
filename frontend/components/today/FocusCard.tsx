"use client";

import { useAskChat } from "@/components/chat/ChatPanel";
import { useT } from "@/components/LocaleProvider";
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

/** One of the top 3 "Start here" tasks, with "Why is this here?" opening the chat for it. */
export function FocusCard({ first, ...props }: Props) {
  const t = useT();
  const askChat = useAskChat();

  return (
    <TaskItem {...props} emphasis={first}>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => askChat(`${t("chatWhy")} (${props.task.title})`, props.task.id)}
        className="mt-3 min-h-11 text-sm font-medium underline underline-offset-4"
      >
        {t("chatWhy")}
        <span className="sr-only"> ({props.task.title})</span>
      </button>
    </TaskItem>
  );
}
