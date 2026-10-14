"use client";

import { useState } from "react";

import { type ToastMessage, Toast } from "@/components/feedback/Toast";
import { useT } from "@/components/LocaleProvider";
import { useWorkspace } from "@/components/WorkspaceProvider";
import type { TranslationKey } from "@/lib/i18n/en";
import {
  type Task,
  type TaskChanges,
  createTask,
  deleteTask,
  updateTask,
} from "@/lib/tasks";

// A short encouraging line after finishing a task, picked from a small set (no streaks).
const CHEERS: TranslationKey[] = ["cheerCounts", "cheerLighter", "cheerStep"];

/**
 * Task actions for views built from the schedule (Today, Week). Each action is saved first and
 * then `refresh` reloads the schedule, so ordering always comes from the backend. A failed
 * action changes nothing on screen, so there is nothing to roll back. Successful actions show a
 * toast; most can be undone on the server from there.
 */
export function useTaskActions(refresh: () => Promise<void>) {
  const workspaceId = useWorkspace();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [failed, setFailed] = useState(false);

  async function run(action: () => Promise<unknown>, next: ToastMessage | null) {
    setFailed(false);
    setToast(null);
    try {
      await action();
    } catch {
      setFailed(true);
      return;
    }
    setToast(next);
    await refresh();
  }

  /** Brings a deleted task back as a new task with the same details. */
  async function restore(task: Task) {
    const created = await createTask(workspaceId, {
      title: task.title,
      impact_score: task.impact_score,
      ...(task.due_date && { due_date: task.due_date }),
      ...(task.estimated_minutes && { estimated_minutes: task.estimated_minutes }),
    });
    if (task.status !== "todo") await updateTask(workspaceId, created.id, { status: task.status });
  }

  function previousValues(task: Task, changes: TaskChanges): TaskChanges {
    const keys = Object.keys(changes) as (keyof TaskChanges)[];
    return Object.fromEntries(keys.map((key) => [key, task[key]])) as TaskChanges;
  }

  const handlers = {
    onToggle: (task: Task) => {
      const finishing = task.status !== "done";
      const changes: TaskChanges = { status: finishing ? "done" : "todo" };
      void run(
        () => updateTask(workspaceId, task.id, changes),
        finishing
          ? {
              message: CHEERS[Math.floor(Math.random() * CHEERS.length)],
              celebrate: true,
              undo: () => updateTask(workspaceId, task.id, { status: task.status }),
            }
          : null,
      );
    },
    onDelete: (task: Task) =>
      void run(() => deleteTask(workspaceId, task.id), {
        message: "deletedNotice",
        undo: () => restore(task),
      }),
    onUpdate: (task: Task, changes: TaskChanges, message: TranslationKey) =>
      void run(() => updateTask(workspaceId, task.id, changes), {
        message,
        undo: () => updateTask(workspaceId, task.id, previousValues(task, changes)),
      }),
  };

  const feedback = {
    toast,
    failed,
    onUndo: () => {
      if (toast?.undo) void run(toast.undo, { message: "undoneNotice" });
    },
    onDismiss: () => setToast(null),
  };

  return { handlers, feedback };
}

type FeedbackProps = ReturnType<typeof useTaskActions>["feedback"];

/** The toast after an action, and the calm error when an action fails. */
export function TaskFeedback({ toast, failed, onUndo, onDismiss }: FeedbackProps) {
  const t = useT();
  return (
    <>
      <Toast toast={toast} onUndo={onUndo} onDismiss={onDismiss} />
      {failed && (
        <p role="alert" className="rounded-xl bg-peach px-3 py-2 text-sm">
          {t("taskActionError")}
        </p>
      )}
    </>
  );
}
