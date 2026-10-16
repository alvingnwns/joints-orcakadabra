"use client";

import { CalendarDays, Leaf } from "lucide-react";
import { useCallback, useState } from "react";

import { LoadError, LoadingSkeleton } from "@/components/LoadStates";
import { useLocale } from "@/components/LocaleProvider";
import { QuickAddForm } from "@/components/tasks/QuickAddForm";
import { RebalanceButton } from "@/components/tasks/RebalanceButton";
import { TaskItem } from "@/components/tasks/TaskItem";
import { TaskFeedback, useTaskActions } from "@/components/tasks/useTaskActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLoad } from "@/components/useLoad";
import { DayColumn } from "@/components/week/DayColumn";
import { useSettingsVersion, useWorkspace } from "@/components/WorkspaceProvider";
import { fill, formatDate } from "@/lib/i18n";
import { formatDuration } from "@/lib/load";
import { type ScheduledTask, type WeekSchedule, getWeek } from "@/lib/schedule";
import { type NewTask, createTask, localDate } from "@/lib/tasks";

type Handlers = ReturnType<typeof useTaskActions>["handlers"];

/** Seven days at a glance, so it's easy to see where there's room. */
export function WeekView() {
  const { t } = useLocale();
  const workspaceId = useWorkspace();
  const settingsVersion = useSettingsVersion();
  // settingsVersion: load again after the person changes their daily capacity.
  const fetcher = useCallback(
    () => getWeek(workspaceId, localDate(0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceId, settingsVersion],
  );
  const { state, reload, refresh } = useLoad(fetcher);
  const { handlers, feedback } = useTaskActions(refresh);
  const [selected, setSelected] = useState(0); // index into days; 0 is today

  async function handleAdd(newTask: NewTask) {
    await createTask(workspaceId, newTask); // the form handles a failure
    await refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-display font-semibold">{t("weekTitle")}</h1>
      <TaskFeedback {...feedback} />
      {state.status === "loading" && <LoadingSkeleton label={t("weekLoading")} />}
      {state.status === "error" && (
        <LoadError message={t("weekLoadError")} onRetry={() => void reload()} />
      )}
      {state.status === "ready" && (
        <WeekContent
          week={state.data}
          selected={selected}
          onSelect={setSelected}
          onAdd={handleAdd}
          onRebalanced={refresh}
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
  onAdd: (task: NewTask) => Promise<void>;
  onRebalanced: () => void;
  handlers: Handlers;
};

function WeekContent({ week, selected, onSelect, onAdd, onRebalanced, handlers }: ContentProps) {
  const { t, locale } = useLocale();
  const isEmpty =
    week.unscheduled.task_count === 0 && week.days.every((day) => day.task_count === 0);
  const day = week.days[selected];
  // Strictly more than the person's daily time (a day that is exactly full is fine).
  const hasOverfullDay = week.days.some((item) => item.total_minutes > week.capacity_minutes);

  return (
    <>
      {isEmpty && <EmptyState illustration="week-empty" text={t("weekEmpty")} />}

      {hasOverfullDay && (
        <Notice tone="attention" action={<RebalanceButton onDone={onRebalanced} />}>
          {fill(t("weekOverNotice"), { capacity: formatDuration(week.capacity_minutes, t) })}
        </Notice>
      )}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
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

      <section aria-labelledby="day-tasks" className="mx-auto max-w-3xl space-y-3">
        <SectionHeading id="day-tasks" icon={CalendarDays} tone="primary">
          {selected === 0 ? t("todayTitle") : formatDate(day.date!, locale)}
        </SectionHeading>
        {/* Keyed by day, so the form starts fresh (and pre-filled) when another day is picked. */}
        <QuickAddForm key={day.date} onAdd={onAdd} defaultDueDate={day.date!} />
        <TaskList tasks={day.tasks} empty={t("dayEmpty")} handlers={handlers} />
      </section>

      {week.unscheduled.task_count > 0 && (
        <section aria-labelledby="unscheduled" className="mx-auto max-w-3xl space-y-3">
          <SectionHeading id="unscheduled" icon={Leaf} tone="whenever">
            {t("unscheduledTitle")} ({week.unscheduled.task_count})
          </SectionHeading>
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
  if (tasks.length === 0) return <p className="text-text-secondary">{empty}</p>;
  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} {...handlers} />
      ))}
    </ul>
  );
}
