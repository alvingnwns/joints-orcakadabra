"use client";

import { useCallback, useEffect, useState } from "react";

import { useT } from "@/components/LocaleProvider";
import { LaterList } from "@/components/tasks/LaterList";
import { QuickAddForm } from "@/components/tasks/QuickAddForm";
import { TaskItem } from "@/components/tasks/TaskItem";
import { useWorkspace } from "@/components/WorkspaceProvider";
import type { TranslationKey } from "@/lib/i18n/en";
import {
  type NewTask,
  type Task,
  type TaskChanges,
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from "@/lib/tasks";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; tasks: Task[] };

export function TasksView() {
  const t = useT();
  const workspaceId = useWorkspace();
  const [state, setState] = useState<State>({ status: "loading" });
  const [actionFailed, setActionFailed] = useState(false);
  const [notice, setNotice] = useState<TranslationKey | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", tasks: await listTasks(workspaceId) });
    } catch {
      setState({ status: "error" });
    }
  }, [workspaceId]);

  useEffect(() => {
    // Async load on mount; state is only set after the request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function changeTasks(change: (tasks: Task[]) => Task[]) {
    setState((current) =>
      current.status === "ready" ? { status: "ready", tasks: change(current.tasks) } : current,
    );
  }

  async function handleAdd(newTask: NewTask) {
    const created = await createTask(workspaceId, newTask); // the form handles a failure
    changeTasks((tasks) => [...tasks, created]);
  }

  async function handleToggle(task: Task) {
    setActionFailed(false);
    setNotice(null);
    try {
      const updated = await updateTask(workspaceId, task.id, {
        status: task.status === "done" ? "todo" : "done",
      });
      changeTasks((tasks) => tasks.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      setActionFailed(true);
    }
  }

  async function handleDelete(task: Task) {
    setActionFailed(false);
    setNotice(null);
    try {
      await deleteTask(workspaceId, task.id);
      changeTasks((tasks) => tasks.filter((item) => item.id !== task.id));
    } catch {
      setActionFailed(true);
    }
  }

  /** Optimistic: the change shows at once and is rolled back if the server says no. */
  async function handleUpdate(task: Task, changes: TaskChanges, message: TranslationKey) {
    const replace = (next: Task) =>
      changeTasks((tasks) => tasks.map((item) => (item.id === next.id ? next : item)));
    setActionFailed(false);
    setNotice(null);
    replace({ ...task, ...changes });
    try {
      replace(await updateTask(workspaceId, task.id, changes));
      setNotice(message);
    } catch {
      replace(task);
      setActionFailed(true);
    }
  }

  const handlers = { onToggle: handleToggle, onDelete: handleDelete, onUpdate: handleUpdate };
  const tasks = state.status === "ready" ? state.tasks : [];
  const current = tasks.filter((task) => task.status !== "deferred");
  const later = tasks.filter((task) => task.status === "deferred");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("tasksTitle")}</h1>
      <QuickAddForm onAdd={handleAdd} />

      <p role="status" className={notice ? "rounded-xl bg-mint px-3 py-2 text-sm" : "sr-only"}>
        {notice && t(notice)}
      </p>

      {actionFailed && (
        <p role="alert" className="rounded-xl bg-peach px-3 py-2 text-sm">
          {t("taskActionError")}
        </p>
      )}

      {state.status === "loading" && (
        <div role="status" aria-busy="true">
          <span className="sr-only">{t("tasksLoading")}</span>
          <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
            <div className="h-16 rounded-card bg-line" />
            <div className="h-16 rounded-card bg-line" />
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div role="alert" className="rounded-card bg-peach p-4">
          <p>{t("tasksLoadError")}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 min-h-11 rounded-full border border-ink px-4 font-medium hover:bg-surface"
          >
            {t("tryAgain")}
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          {current.length === 0 ? (
            <p className="text-muted">{t("tasksEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {current.map((task) => (
                <TaskItem key={task.id} task={task} {...handlers} />
              ))}
            </ul>
          )}
          <LaterList tasks={later} {...handlers} />
        </>
      )}
    </div>
  );
}
