"use client";

import { useCallback, useState } from "react";

import { LoadError, LoadingSkeleton } from "@/components/LoadStates";
import { useT } from "@/components/LocaleProvider";
import { TaskItem } from "@/components/tasks/TaskItem";
import { TaskFeedback, useTaskActions } from "@/components/tasks/useTaskActions";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { useLoad } from "@/components/useLoad";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { fill } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/en";
import {
  LIBRARY_TABS,
  type LibrarySort,
  type LibraryTab,
  tabCounts,
  visibleTasks,
} from "@/lib/library";
import { type Task, listTasks, localDate } from "@/lib/tasks";

type Handlers = ReturnType<typeof useTaskActions>["handlers"];

const TAB_LABEL: Record<LibraryTab, TranslationKey> = {
  active: "tabActive",
  upcoming: "tabUpcoming",
  unscheduled: "tabUnscheduled",
  later: "tabLater",
  completed: "tabCompleted",
};

const TAB_EMPTY: Record<LibraryTab, TranslationKey> = {
  active: "tasksEmptyActive",
  upcoming: "tasksEmptyUpcoming",
  unscheduled: "tasksEmptyUnscheduled",
  later: "tasksEmptyLater",
  completed: "tasksEmptyCompleted",
};

const SORT_LABEL: Record<LibrarySort, TranslationKey> = {
  due: "sortDue",
  added: "sortAdded",
  completed: "sortCompleted",
};

/** Every task, in one place. This is where tasks outside the 7-day week can always be found. */
export function TasksView() {
  const t = useT();
  const workspaceId = useWorkspace();
  const fetcher = useCallback(() => listTasks(workspaceId), [workspaceId]);
  const { state, reload, refresh } = useLoad(fetcher);
  const { handlers, feedback } = useTaskActions(refresh);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-display font-semibold">{t("navTasks")}</h1>
      <TaskFeedback {...feedback} />
      {state.status === "loading" && <LoadingSkeleton label={t("tasksLoading")} />}
      {state.status === "error" && (
        <LoadError message={t("tasksLoadError")} onRetry={() => void reload()} />
      )}
      {state.status === "ready" && <Library tasks={state.data} handlers={handlers} />}
    </div>
  );
}

function Library({ tasks, handlers }: { tasks: Task[]; handlers: Handlers }) {
  const t = useT();
  const today = localDate(0);
  const [tab, setTab] = useState<LibraryTab>("active");
  const [sort, setSort] = useState<LibrarySort>("due");
  const [query, setQuery] = useState("");

  const counts = tabCounts(tasks, today);
  const shown = visibleTasks(tasks, tab, query, sort, today);
  const sorts: LibrarySort[] = tab === "completed" ? ["completed", "due", "added"] : ["due", "added"];

  function chooseTab(next: LibraryTab) {
    setTab(next);
    // "Recently completed" only makes sense for finished tasks.
    if (next === "completed") setSort("completed");
    else if (sort === "completed") setSort("due");
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label={t("tasksSearchLabel")}>
          {(control) => (
            <Input
              {...control}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
        </Field>
        <Field label={t("tasksSortLabel")}>
          {(control) => (
            <Select
              {...control}
              value={sort}
              onChange={(event) => setSort(event.target.value as LibrarySort)}
            >
              {sorts.map((option) => (
                <option key={option} value={option}>
                  {t(SORT_LABEL[option])}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div role="group" aria-label={t("tasksFilterLabel")} className="flex flex-wrap gap-2">
        {LIBRARY_TABS.map((option) => (
          <Button
            key={option}
            variant={option === tab ? "primary" : "secondary"}
            aria-pressed={option === tab}
            onClick={() => chooseTab(option)}
          >
            {t(TAB_LABEL[option])} ({counts[option]})
          </Button>
        ))}
      </div>

      <p role="status" className="text-sm text-text-secondary">
        {fill(t(shown.length === 1 ? "taskCountOne" : "taskCountMany"), { n: shown.length })}
      </p>

      {shown.length === 0 ? (
        <EmptyState
          tone="neutral"
          text={
            counts[tab] > 0
              ? fill(t("tasksNoResults"), { query: query.trim() })
              : t(TAB_EMPTY[tab])
          }
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((task) => (
            <TaskItem key={task.id} task={task} {...handlers} />
          ))}
        </ul>
      )}
    </>
  );
}
