"use client";

import { useLocale } from "@/components/LocaleProvider";
import { Mascot } from "@/components/ui/Mascot";
import { LoadBar } from "@/components/week/LoadBar";
import { formatDate } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/en";
import type { DayLoad } from "@/lib/schedule";
import { localDate } from "@/lib/tasks";

function greetingKey(hour: number): TranslationKey {
  if (hour < 12) return "greetMorning";
  if (hour < 18) return "greetAfternoon";
  return "greetEvening";
}

type Props = {
  /** Today's bucket from the week schedule (the backend's own totals), if it could be loaded. */
  day: DayLoad | null;
  capacity: number | null;
};

/**
 * The top of the page: a friendly greeting with the mascot, the date, and how full today is.
 * The load numbers come straight from the backend; nothing is worked out here.
 */
export function TodayHero({ day, capacity }: Props) {
  const { t, locale } = useLocale();

  return (
    <section
      aria-labelledby="today-title"
      className="flex flex-col gap-5 overflow-hidden rounded-dialog bg-wash p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex items-center gap-4">
        <Mascot mood="hello" size={96} className="size-20 sm:size-24" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">
            {t(greetingKey(new Date().getHours()))} · {formatDate(localDate(0), locale)}
          </p>
          <h1 id="today-title" className="text-display font-extrabold tracking-tight">
            {t("todayTitle")}
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">{t("greetLine")}</p>
        </div>
      </div>

      {day && capacity ? (
        <div className="rounded-card bg-surface p-4 shadow-soft sm:w-64 sm:shrink-0">
          <p className="mb-2 text-sm font-semibold text-text-secondary">{t("todayLoad")}</p>
          <LoadBar totalMinutes={day.total_minutes} capacity={capacity} isHeavy={day.is_heavy} />
        </div>
      ) : null}
    </section>
  );
}
