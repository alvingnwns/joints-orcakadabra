"use client";

import { useCallback, useState } from "react";

import { Illustration } from "@/components/illustrations/Illustration";
import { LoadError, LoadingSkeleton } from "@/components/LoadStates";
import { useLocale } from "@/components/LocaleProvider";
import { TaskItem } from "@/components/tasks/TaskItem";
import { TaskFeedback, useTaskActions } from "@/components/tasks/useTaskActions";
import { useLoad } from "@/components/useLoad";
import { DayColumn } from "@/components/week/DayColumn";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { formatDate } from "@/lib/i18n";
import { type ScheduledTask, type WeekSchedule, getWeek } from "@/lib/schedule";
import { localDate } from "@/lib/tasks";

type Handlers = ReturnType<typeof useTaskActions>["handlers"];

/** Seven days at a glance, so it's easy to see where there's room. */
export function WeekView() {
  const { t } = useLocale();
  const workspaceId = useWorkspace();
  const fetcher = useCallback(() => getWeek(workspaceId, localDate(0)), [workspaceId]);
  const { state, reload, refresh } = useLoad(fetcher);
  const { handlers, notice, failed } = useTaskActions(refresh);
  const [selected, setSelected] = useState(0); // index into days; 0 is today

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("weekTitle")}</h1>
      <TaskFeedback notice={notice} failed={failed} />
      {state.status === "loading" && <LoadingSkeleton label={t("weekLoading")} />}
      {state.status === "error" && (
        <LoadError message={t("weekLoadError")} onRetry={() => void reload()} />
      )}
      {state.status === "ready" && (
        <WeekContent
          week={state.data}
          selected={selected}
          onSelect={setSelected}
          handlers={handlers}
        />
      )}
    </div>
  );
}

type ContentProps = {
  week: WeekSchedule;
  selected: number;
  onSelect: (index: number) => void;
  handlers: Handlers;
};

function WeekContent({ week, selected, onSelect, handlers }: ContentProps) {
  const { t, locale } = useLocale();
  const isEmpty =
    week.unscheduled.task_count === 0 && week.days.every((day) => day.task_count === 0);
  const day = week.days[selected];

  return (
    <>
      {isEmpty && (
        <div className="rounded-card bg-mint p-6 text-center">
          <Illustration name="week-empty" width={200} className="mb-4" />
          <p>{t("weekEmpty")}</p>
        </div>
      )}

      <ul className="grid gap-2 sm:grid-cols-7">
        {week.days.map((item, index) => (
          <li key={item.date}>
            <DayColumn
              day={{ ...item, date: item.date! }}
              isToday={index === 0}
              capacity={week.capacity_minutes}
              selected={index === selected}
              onSelect={() => onSelect(index)}
            />
          </li>
        ))}
      </ul>

      <section aria-labelledby="day-tasks" className="space-y-3">
        <h2 id="day-tasks" className="text-lg font-semibold">
          {selected === 0 ? t("todayTitle") : formatDate(day.date!, locale)}
        </h2>
        <TaskList tasks={day.tasks} empty={t("dayEmpty")} handlers={handlers} />
      </section>

      {week.unscheduled.task_count > 0 && (
        <section aria-labelledby="unscheduled" className="space-y-3">
          <h2 id="unscheduled" className="text-lg font-semibold">
            {t("unscheduledTitle")} ({week.unscheduled.task_count})
          </h2>
          <TaskList tasks={week.unscheduled.tasks} empty="" handlers={handlers} />
        </section>
      )}
    </>
  );
}

function TaskList({
  tasks,
  empty,
  handlers,
}: {
  tasks: ScheduledTask[];
  empty: string;
  handlers: Handlers;
}) {
  if (tasks.length === 0) return <p className="text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} {...handlers} />
      ))}
    </ul>
  );
}
