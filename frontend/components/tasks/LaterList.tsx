"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";

import { useT } from "@/components/LocaleProvider";
import { Icon } from "@/components/ui/Icon";
import { SECTION_TONES, type SectionTone } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import type { TranslationKey } from "@/lib/i18n/en";
import type { Task } from "@/lib/tasks";

import type { EditTask, UpdateTask } from "./TaskActions";
import { TaskItem } from "./TaskItem";

type Props = {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onUpdate: UpdateTask;
  onEdit: EditTask;
  /** Also used for the collapsed "Done today" list. */
  titleKey?: TranslationKey;
  icon: LucideIcon;
  tone: SectionTone;
};

/** A collapsed group of tasks (saved for later, or done today) that stays out of the way. */
export function LaterList({ tasks, titleKey = "laterTitle", icon, tone, ...handlers }: Props) {
  const t = useT();
  if (tasks.length === 0) return null;

  return (
    <details className="group rounded-card border border-border bg-surface p-3 shadow-soft">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2.5 font-bold">
        <span
          aria-hidden="true"
          className={cn("flex size-8 items-center justify-center rounded-full", SECTION_TONES[tone])}
        >
          <Icon icon={icon} />
        </span>
        <span className="flex-1">
          {t(titleKey)} ({tasks.length})
        </span>
        <Icon icon={ChevronDown} className="transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-3 space-y-3">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} {...handlers} />
        ))}
      </ul>
    </details>
  );
}
