"use client";

import { CircleQuestionMark } from "lucide-react";
import { type ReactNode, useId } from "react";

import { useAskChat } from "@/components/chat/ChatPanel";
import { useLocale } from "@/components/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { taskReasons } from "@/lib/explain";
import { formatDate } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/en";
import type { ScheduledTask } from "@/lib/schedule";
import { type Task, localDate } from "@/lib/tasks";

import { type EditTask, TaskActions, type UpdateTask } from "./TaskActions";

type Props = {
  /** A scheduled task (from Today or Week) also carries the backend's priority label. */
  task: Task & Partial<Pick<ScheduledTask, "priority_label">>;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onUpdate: UpdateTask;
  onEdit: EditTask;
  /** The first "Start here" card stands out a little. */
  emphasis?: boolean;
  /** Extra controls shown below the actions, e.g. "Why is this here?". */
  children?: ReactNode;
};

const PRIORITY_TEXT: Record<ScheduledTask["priority_label"], TranslationKey> = {
  focus: "priorityFocus",
  soon: "prioritySoon",
  whenever: "priorityWhenever",
};

export function TaskItem({
  task,
  onToggle,
  onDelete,
  onUpdate,
  onEdit,
  emphasis = false,
  children,
}: Props) {
  const { t, locale } = useLocale();
  const askChat = useAskChat();
  const titleId = useId();
  const done = task.status === "done";
  const priority = task.priority_label;
  // Reasons only for tasks the backend has ranked (active ones on Today and Week).
  const reasons = priority ? taskReasons(task, localDate(0), t) : [];

  return (
    <Card as="li" tone={emphasis ? "emphasis" : "surface"}>
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          aria-labelledby={titleId}
          checked={done}
          onChange={() => onToggle(task)}
          className="mt-1 size-6 shrink-0 accent-primary"
        />
        <span className="min-w-0 flex-1">
          <span id={titleId} className={done ? "text-text-secondary line-through" : "font-medium"}>
            {task.title}
          </span>
          {(priority || task.due_date || task.estimated_minutes) && (
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {priority && (
                <Badge tone={priority === "focus" ? "primary" : "neutral"}>
                  {t(PRIORITY_TEXT[priority])}
                </Badge>
              )}
              {(task.due_date || task.estimated_minutes) && (
                <span className="text-sm text-text-secondary">
                  {task.due_date && `${t("dueLabel")} ${formatDate(task.due_date, locale)}`}
                  {task.due_date && task.estimated_minutes && " · "}
                  {task.estimated_minutes && `${task.estimated_minutes} ${t("minutesShort")}`}
                </span>
              )}
            </span>
          )}
          {task.description && (
            <span className="mt-1 line-clamp-2 block text-sm text-text-secondary">
              {task.description}
            </span>
          )}
          {reasons.length > 0 && (
            <span className="mt-1 block text-sm text-text-secondary">{reasons.join(" · ")}</span>
          )}
        </span>
      </label>

      <TaskActions task={task} onUpdate={onUpdate} onEdit={onEdit} onDelete={onDelete} />
      {/* Any ranked task can be asked about, not only the top three. */}
      {priority && (
        <Button
          variant="quiet"
          icon={CircleQuestionMark}
          aria-haspopup="dialog"
          onClick={() => askChat(`${t("chatWhy")} (${task.title})`, task.id)}
          className="mt-3"
        >
          {t("chatWhy")}
          <span className="sr-only"> ({task.title})</span>
        </Button>
      )}
      {children}
    </Card>
  );
}
