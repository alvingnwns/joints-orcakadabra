"use client";

import { useLocale } from "@/components/LocaleProvider";
import { LoadBar } from "@/components/week/LoadBar";
import { formatDate } from "@/lib/i18n";
import type { DayLoad } from "@/lib/schedule";

type Props = {
  day: DayLoad & { date: string };
  isToday: boolean;
  capacity: number;
  selected: boolean;
  onSelect: () => void;
};

/** One day of the week. Pressing it shows that day's tasks below the week. */
export function DayColumn({ day, isToday, capacity, selected, onSelect }: Props) {
  const { t, locale } = useLocale();

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`w-full rounded-card p-3 text-left ${
        selected ? "bg-surface shadow-md ring-2 ring-ink" : "bg-surface/70 shadow-sm"
      } ${day.is_heavy ? "border-2 border-peach" : ""}`}
    >
      <span className="block font-medium">
        {isToday ? t("todayTitle") : formatDate(day.date, locale)}
      </span>
      <span className="mt-2 block">
        <LoadBar totalMinutes={day.total_minutes} capacity={capacity} isHeavy={day.is_heavy} />
      </span>
    </button>
  );
}
