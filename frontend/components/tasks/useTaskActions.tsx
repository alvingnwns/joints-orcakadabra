"use client";

import { useState } from "react";

import { useT } from "@/components/LocaleProvider";
import { useWorkspace } from "@/components/WorkspaceProvider";
import type { TranslationKey } from "@/lib/i18n/en";
import { type Task, type TaskChanges, deleteTask, updateTask } from "@/lib/tasks";

/**
 * Task actions for views built from the schedule (Today, Week). Each action is saved first and
 * then `refresh` reloads the schedule, so ordering always comes from the backend. A failed
 * action changes nothing on screen, so there is nothing to roll back.
 */
export function useTaskActions(refresh: () => Promise<void>) {
  const workspaceId = useWorkspace();
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [failed, setFailed] = useState(false);

  async function run(action: () => Promise<unknown>, message: TranslationKey | null) {
    setFailed(false);
    setNotice(null);
    try {
      await action();
    } catch {
      setFailed(true);
      return;
    }
    setNotice(message);
    await refresh();
  }

  const handlers = {
    onToggle: (task: Task) =>
      void run(
        () =>
          updateTask(workspaceId, task.id, { status: task.status === "done" ? "todo" : "done" }),
        null,
      ),
    onDelete: (task: Task) => void run(() => deleteTask(workspaceId, task.id), null),
    onUpdate: (task: Task, changes: TaskChanges, message: TranslationKey) =>
      void run(() => updateTask(workspaceId, task.id, changes), message),
  };

  return { handlers, notice, failed };
}

/** The kind confirmation (announced politely) and the calm error after an action. */
export function TaskFeedback({ notice, failed }: { notice: TranslationKey | null; failed: boolean }) {
  const t = useT();
  return (
    <>
      <p role="status" className={notice ? "rounded-xl bg-mint px-3 py-2 text-sm" : "sr-only"}>
        {notice && t(notice)}
      </p>
      {failed && (
        <p role="alert" className="rounded-xl bg-peach px-3 py-2 text-sm">
          {t("taskActionError")}
        </p>
      )}
    </>
  );
}
