"use client";

import {
  CalendarDays,
  Check,
  CircleQuestionMark,
  Clock,
  Leaf,
  Lightbulb,
  Moon,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useId } from "react";

import { useAskChat } from "@/components/chat/ChatPanel";
import { useLocale } from "@/components/LocaleProvider";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
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
  /** Extra text shown under the actions, e.g. why a top pick is not due today. */
  children?: ReactNode;
};

type Look = { stripe: string; tone: BadgeTone; icon: LucideIcon; text: TranslationKey } | null;

// Five clearly different hues, each with its own word and icon (color is never the only cue).
const PRIORITY_LOOK: Record<NonNullable<ScheduledTask["priority_label"]>, NonNullable<Look>> = {
  focus: { stripe: "bg-primary", tone: "focus", icon: Target, text: "priorityFocus" },
  soon: { stripe: "bg-soon", tone: "soon", icon: Clock, text: "prioritySoon" },
  whenever: { stripe: "bg-whenever", tone: "whenever", icon: Leaf, text: "priorityWhenever" },
};

function lookOf(task: Props["task"]): Look {
  if (task.status === "done") {
    return { stripe: "bg-done", tone: "done", icon: Check, text: "statusDone" };
  }
  if (task.status === "deferred") {
    return { stripe: "bg-later", tone: "later", icon: Moon, text: "laterTitle" };
  }
  return task.priority_label ? PRIORITY_LOOK[task.priority_label] : null;
}

function Chip({ icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-0.5 text-meta font-medium text-text-secondary">
      <Icon icon={icon} size={14} />
      {children}
    </span>
  );
}

/**
 * One task, used on Today, Week and All tasks. A colored edge and badge say at a glance how it
 * ranks (or that it is done / saved for later); the title, date and time come next, then the
 * plain-language reason, and the Action menu.
 */
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
  const look = lookOf(task);
  // Reasons only for tasks the backend has ranked (active ones on Today and Week).
  const reasons = task.priority_label ? taskReasons(task, localDate(0), t) : [];

  const why = task.priority_label && (
    <Button
      variant="quiet"
      icon={CircleQuestionMark}
      aria-haspopup="dialog"
      onClick={() => askChat(`${t("chatWhy")} (${task.title})`, task.id)}
    >
      {t("chatWhy")}
      <span className="sr-only"> ({task.title})</span>
    </Button>
  );

  return (
    <Card
      as="li"
      tone={emphasis ? "emphasis" : "surface"}
      padding="none"
      className="relative overflow-hidden"
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1.5", look?.stripe ?? "bg-border")}
      />
      <div className="p-4 pl-5">
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            aria-labelledby={titleId}
            checked={done}
            onChange={() => onToggle(task)}
            className="task-check mt-0.5"
          />
          <span className="min-w-0 flex-1">
            <span
              id={titleId}
              className={cn(
                "block font-semibold leading-snug",
                emphasis && "text-lg",
                done && "font-medium text-text-secondary line-through",
              )}
            >
              {task.title}
            </span>
            {(look || task.due_date || task.estimated_minutes) && (
              <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                {look && (
                  <Badge tone={look.tone} icon={look.icon}>
                    {t(look.text)}
                  </Badge>
                )}
                {task.due_date && (
                  <Chip icon={CalendarDays}>
                    {t("dueLabel")} {formatDate(task.due_date, locale)}
                  </Chip>
                )}
                {task.estimated_minutes && (
                  <Chip icon={Timer}>
                    {task.estimated_minutes} {t("minutesShort")}
                  </Chip>
                )}
              </span>
            )}
            {task.description && (
              <span className="mt-1.5 line-clamp-2 block text-sm text-text-secondary">
                {task.description}
              </span>
            )}
            {reasons.length > 0 && (
              <span className="mt-1.5 flex items-start gap-1.5 text-sm text-text-secondary">
                <Icon icon={Lightbulb} size={15} className="mt-0.5 text-soon" />
                <span>{reasons.join(" · ")}</span>
              </span>
            )}
          </span>
        </label>

        <TaskActions
          task={task}
          onUpdate={onUpdate}
          onEdit={onEdit}
          onDelete={onDelete}
          extra={why}
        />
        {children}
      </div>
    </Card>
  );
}
