"use client";

import { useCallback, useEffect, useState } from "react";

import { useT } from "@/components/LocaleProvider";
import { QuickAddForm } from "@/components/tasks/QuickAddForm";
import { TaskItem } from "@/components/tasks/TaskItem";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { type NewTask, type Task, createTask, deleteTask, listTasks, updateTask } from "@/lib/tasks";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; tasks: Task[] };

export function TasksView() {
  const t = useT();
  const workspaceId = useWorkspace();
  const [state, setState] = useState<State>({ status: "loading" });
  const [actionFailed, setActionFailed] = useState(false);

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
    try {
      await deleteTask(workspaceId, task.id);
      changeTasks((tasks) => tasks.filter((item) => item.id !== task.id));
    } catch {
      setActionFailed(true);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("tasksTitle")}</h1>
      <QuickAddForm onAdd={handleAdd} />

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

      {state.status === "ready" &&
        (state.tasks.length === 0 ? (
          <p className="text-muted">{t("tasksEmpty")}</p>
        ) : (
          <ul className="space-y-3">
            {state.tasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </ul>
        ))}
    </div>
  );
}
