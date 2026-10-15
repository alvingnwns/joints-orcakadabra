"use client";

import { useCallback } from "react";

import type { IllustrationName } from "@/components/illustrations/Illustration";
import { LoadError, LoadingSkeleton } from "@/components/LoadStates";
import { useT } from "@/components/LocaleProvider";
import { LaterList } from "@/components/tasks/LaterList";
import { QuickAddForm } from "@/components/tasks/QuickAddForm";
import { TaskItem } from "@/components/tasks/TaskItem";
import { TaskFeedback, useTaskActions } from "@/components/tasks/useTaskActions";
import { FocusCard } from "@/components/today/FocusCard";
import { HeavyLoadNotice } from "@/components/today/HeavyLoadNotice";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLoad } from "@/components/useLoad";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { type TodaySchedule, getToday } from "@/lib/schedule";
import { type NewTask, type Task, createTask, listTasks, localDate } from "@/lib/tasks";

type TodayData = { schedule: TodaySchedule; later: Task[]; doneToday: Task[] };
type Handlers = ReturnType<typeof useTaskActions>["handlers"];

/** The home screen: the next step first, then the rest of today, then what can wait. */
export function TodayView() {
  const t = useT();
  const workspaceId = useWorkspace();

  // The schedule gives the ranked active tasks; the plain list adds Later and Done today.
  const fetcher = useCallback(async (): Promise<TodayData> => {
    const today = localDate(0);
    const [schedule, all] = await Promise.all([
      getToday(workspaceId, today),
      listTasks(workspaceId),
    ]);
    return {
      schedule,
      later: all.filter((task) => task.status === "deferred"),
      doneToday: all.filter(
        (task) =>
          task.status === "done" &&
          !!task.completed_at &&
          localDate(0, new Date(task.completed_at)) === today,
      ),
    };
  }, [workspaceId]);

  const { state, reload, refresh } = useLoad(fetcher);
  const { handlers, feedback } = useTaskActions(refresh);

  async function handleAdd(newTask: NewTask) {
    await createTask(workspaceId, newTask); // the form handles a failure
    await refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-display font-semibold">{t("todayTitle")}</h1>
      <QuickAddForm onAdd={handleAdd} />
      <TaskFeedback {...feedback} />

      {state.status === "loading" && <LoadingSkeleton label={t("todayLoading")} />}
      {state.status === "error" && (
        <LoadError message={t("todayLoadError")} onRetry={() => void reload()} />
      )}
      {state.status === "ready" && <TodayContent data={state.data} handlers={handlers} />}
    </div>
  );
}

function TodayContent({ data, handlers }: { data: TodayData; handlers: Handlers }) {
  const t = useT();
  const { schedule, later, doneToday } = data;
  const { top, rest, heavy_load, delay_suggestion } = schedule;
  const suggested =
    [...top, ...rest].find((task) => task.id === delay_suggestion?.task_id) ?? null;
  // All done today → celebrate; no tasks anywhere yet → an empty list; otherwise a clear day.
  const emptyIllustration: IllustrationName =
    doneToday.length > 0 ? "all-done" : later.length === 0 ? "empty-tasks" : "day-clear";

  return (
    <>
      {heavy_load && (
        <HeavyLoadNotice
          load={heavy_load}
          suggestion={suggested}
          onMove={(task) => handlers.onUpdate(task, { due_date: localDate(1) }, "movedTomorrow")}
        />
      )}

      {top.length === 0 ? (
        <EmptyState
          illustration={emptyIllustration}
          text={t(doneToday.length > 0 ? "allDone" : "dayClear")}
        />
      ) : (
        <section aria-labelledby="start-here" className="space-y-3">
          <h2 id="start-here" className="text-section font-semibold">
            {t("startHere")}
          </h2>
          <ol className="space-y-3">
            {top.map((task, index) => (
              <FocusCard key={task.id} task={task} first={index === 0} {...handlers} />
            ))}
          </ol>
        </section>
      )}

      {rest.length > 0 && (
        <section aria-labelledby="also-today" className="space-y-3">
          <h2 id="also-today" className="text-section font-semibold">
            {t("alsoToday")}
          </h2>
          <ul className="space-y-3">
            {rest.map((task) => (
              <TaskItem key={task.id} task={task} {...handlers} />
            ))}
          </ul>
        </section>
      )}

      <LaterList tasks={later} {...handlers} />
      <LaterList tasks={doneToday} titleKey="doneTodayTitle" {...handlers} />
    </>
  );
}

