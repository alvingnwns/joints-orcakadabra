"use client";

import { Check, ListChecks, Moon, Plus, Target } from "lucide-react";
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
import { TodayHero } from "@/components/today/TodayHero";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLoad } from "@/components/useLoad";
import { useSettingsVersion, useWorkspace } from "@/components/WorkspaceProvider";
import {
  type DayLoad,
  type TodaySchedule,
  getToday,
  getWeek,
} from "@/lib/schedule";
import { type NewTask, type Task, createTask, listTasks, localDate } from "@/lib/tasks";

type TodayData = {
  schedule: TodaySchedule;
  later: Task[];
  doneToday: Task[];
  /** Today's totals from the week schedule, for the load meter. Null if that call failed. */
  day: DayLoad | null;
  capacity: number | null;
};
type Handlers = ReturnType<typeof useTaskActions>["handlers"];

/** The home screen: the next step first, then the rest of today, then what can wait. */
export function TodayView() {
  const t = useT();
  const workspaceId = useWorkspace();
  const settingsVersion = useSettingsVersion();

  // The schedule gives the ranked active tasks; the plain list adds Later and Done today; the
  // week gives today's load. The load meter is a nicety, so its failure never blocks the page.
  const fetcher = useCallback(async (): Promise<TodayData> => {
    const today = localDate(0);
    const [schedule, all, week] = await Promise.all([
      getToday(workspaceId, today),
      listTasks(workspaceId),
      getWeek(workspaceId, today).catch(() => null),
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
      day: week?.days[0] ?? null,
      capacity: week?.capacity_minutes ?? null,
    };
    // settingsVersion: load again after the person changes their daily capacity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, settingsVersion]);

  const { state, reload, refresh } = useLoad(fetcher);
  const { handlers, feedback } = useTaskActions(refresh);

  async function handleAdd(newTask: NewTask) {
    await createTask(workspaceId, newTask); // the form handles a failure
    await refresh();
  }

  const ready = state.status === "ready" ? state.data : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <TodayHero day={ready?.day ?? null} capacity={ready?.capacity ?? null} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* Adding a task comes first on a phone, and sits beside the list on a wide screen. */}
        <aside className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:self-start">
          <div className="mb-2 flex items-center gap-2.5 lg:hidden">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary"
            >
              <Icon icon={Plus} />
            </span>
            <p className="text-section font-bold">{t("addTaskTitle")}</p>
          </div>
          <QuickAddForm onAdd={handleAdd} />
        </aside>

        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-1">
          <TaskFeedback {...feedback} />
          {state.status === "loading" && <LoadingSkeleton label={t("todayLoading")} />}
          {state.status === "error" && (
            <LoadError message={t("todayLoadError")} onRetry={() => void reload()} />
          )}
          {ready && <TodayContent data={ready} handlers={handlers} />}
        </div>
      </div>
    </div>
  );
}

function TodayContent({ data, handlers }: { data: TodayData; handlers: Handlers }) {
  const t = useT();
  const { schedule, later, doneToday } = data;
  const { top, rest, heavy_load, delay_suggestion } = schedule;
  const suggested =
    [...top, ...rest].find((task) => task.id === delay_suggestion?.task_id) ?? null;
  // All done today → celebrate with the mascot; no tasks anywhere yet → an empty list; else a clear day.
  const allDone = doneToday.length > 0;
  const emptyIllustration: IllustrationName = later.length === 0 ? "empty-tasks" : "day-clear";

  return (
    <>
      {heavy_load && (
        <HeavyLoadNotice
          load={heavy_load}
          suggestion={suggested}
          reason={delay_suggestion?.reason}
          onMove={(task) => handlers.onUpdate(task, { due_date: localDate(1) }, "movedTomorrow")}
        />
      )}

      {top.length === 0 ? (
        <EmptyState
          mascot={allDone ? "happy" : undefined}
          illustration={allDone ? undefined : emptyIllustration}
          text={t(allDone ? "allDone" : "dayClear")}
        />
      ) : (
        <section aria-labelledby="start-here" className="space-y-3">
          <SectionHeading id="start-here" icon={Target} tone="primary" count={top.length}>
            {t("startHere")}
          </SectionHeading>
          <ol className="space-y-3">
            {top.map((task, index) => (
              <FocusCard key={task.id} task={task} first={index === 0} {...handlers} />
            ))}
          </ol>
        </section>
      )}

      {rest.length > 0 && (
        <section aria-labelledby="also-today" className="space-y-3">
          <SectionHeading id="also-today" icon={ListChecks} tone="whenever" count={rest.length}>
            {t("alsoToday")}
          </SectionHeading>
          <ul className="space-y-3">
            {rest.map((task) => (
              <TaskItem key={task.id} task={task} {...handlers} />
            ))}
          </ul>
        </section>
      )}

      <LaterList tasks={later} icon={Moon} tone="later" {...handlers} />
      <LaterList
        tasks={doneToday}
        titleKey="doneTodayTitle"
        icon={Check}
        tone="done"
        {...handlers}
      />
    </>
  );
}
