"use client";

import { useLocale } from "@/components/LocaleProvider";
import { Icon } from "@/components/ui/Icon";
import { LEVEL_STYLE } from "@/components/week/loadStyle";
import { LoadBar } from "@/components/week/LoadBar";
import { cn } from "@/lib/cn";
import { fill, formatDate } from "@/lib/i18n";
import { loadLevel } from "@/lib/load";
import type { DayLoad } from "@/lib/schedule";

type Props = {
  day: DayLoad & { date: string };
  isToday: boolean;
  capacity: number;
  selected: boolean;
  onSelect: () => void;
};

/**
 * One day of the week. Its whole card changes with how full the day is (calm white, amber when
 * nearly full, coral when full), including the color of the date, plus a word and an icon.
 * Pressing it shows that day's tasks below the week.
 */
export function DayColumn({ day, isToday, capacity, selected, onSelect }: Props) {
  const { t, locale } = useLocale();
  const level = loadLevel(day.total_minutes, capacity, day.is_heavy);
  const style = LEVEL_STYLE[level];

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "w-full rounded-card border-2 p-3 text-left shadow-soft hover:shadow-lift",
        style.card,
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={cn("block text-base font-bold", style.date)}>
          {isToday ? t("todayTitle") : formatDate(day.date, locale)}
        </span>
        {style.icon && level !== "none" && <Icon icon={style.icon} className={style.date} />}
      </span>
      <span className={cn("mt-0.5 block text-sm", style.muted)}>
        {fill(t(day.task_count === 1 ? "taskCountOne" : "taskCountMany"), { n: day.task_count })}
      </span>
      <span className="mt-2.5 block">
        <LoadBar
          totalMinutes={day.total_minutes}
          capacity={capacity}
          isHeavy={day.is_heavy}
          level={level}
        />
      </span>
    </button>
  );
}
