"use client";

import { useT } from "@/components/LocaleProvider";
import { EmptyState } from "@/components/ui/EmptyState";

/** Placeholder so the "All tasks" link has a page. The real list arrives in the next checkpoint. */
export function TasksView() {
  const t = useT();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-display font-semibold">{t("navTasks")}</h1>
      <EmptyState tone="neutral" illustration="empty-tasks" text={t("tasksSoon")} />
    </div>
  );
}
