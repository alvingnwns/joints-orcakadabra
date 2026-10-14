"use client";

import { useId, useState } from "react";

import { useLocale } from "@/components/LocaleProvider";
import { formatDate } from "@/lib/i18n";
import type { Task } from "@/lib/tasks";

import { TaskActions, type UpdateTask } from "./TaskActions";

type Props = {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onUpdate: UpdateTask;
};

const buttonClass = "min-h-11 rounded-full border border-ink px-4 text-sm font-medium hover:bg-cream";

export function TaskItem({ task, onToggle, onDelete, onUpdate }: Props) {
  const { t, locale } = useLocale();
  const titleId = useId();
  const [confirming, setConfirming] = useState(false);
  const done = task.status === "done";

  return (
    <li className="rounded-card bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <label className="flex min-h-11 flex-1 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={done}
            onChange={() => onToggle(task)}
            className="mt-1 size-6 shrink-0"
          />
          <span>
            <span id={titleId} className={done ? "text-muted line-through" : "font-medium"}>
              {task.title}
            </span>
            {(task.due_date || task.estimated_minutes) && (
              <span className="mt-1 block text-sm text-muted">
                {task.due_date && `${t("dueLabel")} ${formatDate(task.due_date, locale)}`}
                {task.due_date && task.estimated_minutes && " · "}
                {task.estimated_minutes && `${task.estimated_minutes} ${t("minutesShort")}`}
              </span>
            )}
          </span>
        </label>
        {!confirming && (
          <button
            type="button"
            aria-describedby={titleId}
            onClick={() => setConfirming(true)}
            className={buttonClass}
          >
            {t("deleteButton")}
          </button>
        )}
      </div>

      <TaskActions task={task} onUpdate={onUpdate} />

      {confirming && (
        <div role="group" aria-label={t("deleteConfirm")} className="mt-3 rounded-xl bg-peach p-3">
          <p className="text-sm">{t("deleteConfirm")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {/* Focus lands on the safe choice. */}
            <button
              type="button"
              autoFocus
              onClick={() => setConfirming(false)}
              className={buttonClass}
            >
              {t("deleteKeep")}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onDelete(task);
              }}
              className="min-h-11 rounded-full bg-ink px-4 text-sm font-medium text-cream"
            >
              {t("deleteYes")}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
