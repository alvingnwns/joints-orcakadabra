"use client";

import { Trash2 } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { useLocale } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/i18n";
import type { Task } from "@/lib/tasks";

import { TaskActions, type UpdateTask } from "./TaskActions";

type Props = {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onUpdate: UpdateTask;
  /** The first "Start here" card stands out a little. */
  emphasis?: boolean;
  /** Extra controls shown below the actions, e.g. "Why is this here?". */
  children?: ReactNode;
};

export function TaskItem({
  task,
  onToggle,
  onDelete,
  onUpdate,
  emphasis = false,
  children,
}: Props) {
  const { t, locale } = useLocale();
  const titleId = useId();
  const [confirming, setConfirming] = useState(false);
  const done = task.status === "done";

  return (
    <Card as="li" tone={emphasis ? "emphasis" : "surface"}>
      <div className="flex items-start justify-between gap-3">
        <label className="flex min-h-11 flex-1 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={done}
            onChange={() => onToggle(task)}
            className="mt-1 size-6 shrink-0 accent-primary"
          />
          <span>
            <span
              id={titleId}
              className={done ? "text-text-secondary line-through" : "font-medium"}
            >
              {task.title}
            </span>
            {(task.due_date || task.estimated_minutes) && (
              <span className="mt-1 block text-sm text-text-secondary">
                {task.due_date && `${t("dueLabel")} ${formatDate(task.due_date, locale)}`}
                {task.due_date && task.estimated_minutes && " · "}
                {task.estimated_minutes && `${task.estimated_minutes} ${t("minutesShort")}`}
              </span>
            )}
          </span>
        </label>
        {!confirming && (
          <Button
            variant="quiet"
            icon={Trash2}
            aria-describedby={titleId}
            onClick={() => setConfirming(true)}
          >
            {t("deleteButton")}
          </Button>
        )}
      </div>

      <TaskActions task={task} onUpdate={onUpdate} />
      {children}

      {confirming && (
        <div
          role="group"
          aria-label={t("deleteConfirm")}
          className="mt-3 rounded-control bg-danger-soft p-3"
        >
          <p className="text-sm">{t("deleteConfirm")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {/* Focus lands on the safe choice. */}
            <Button autoFocus onClick={() => setConfirming(false)}>
              {t("deleteKeep")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                onDelete(task);
              }}
            >
              {t("deleteYes")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
