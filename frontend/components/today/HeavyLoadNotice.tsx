"use client";

import { useState } from "react";

import { useLocale } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { fill, formatDate } from "@/lib/i18n";
import type { DelaySuggestion, HeavyLoad, ScheduledTask } from "@/lib/schedule";
import { localDate } from "@/lib/tasks";

type Props = {
  load: HeavyLoad;
  /** The task the backend suggests moving (C5); the notice always pairs with it. */
  suggestion: ScheduledTask | null;
  reason?: DelaySuggestion["reason"];
  onMove: (task: ScheduledTask) => void;
};

/**
 * A calm "full day" notice with one concrete idea. Moving is a suggestion until the person
 * agrees to it: "Move it" shows what would happen, and only "Yes, move it" changes anything.
 */
export function HeavyLoadNotice({ load, suggestion, reason, onMove }: Props) {
  const { t, locale } = useLocale();
  const [reviewing, setReviewing] = useState(false);

  return (
    <section aria-labelledby="heavy-load-title">
      <Notice
        tone="attention"
        title={t("heavyLoadTitle")}
        titleAs="h2"
        titleId="heavy-load-title"
        action={
          suggestion && (
            <div className="w-full space-y-3">
              <div>
                <p>
                  {t("delaySuggestion")} <strong>{suggestion.title}</strong>
                </p>
                {reason && (
                  <p className="text-sm">
                    {t(reason === "past_its_date" ? "delayReasonPast" : "delayReasonLowest")}
                  </p>
                )}
              </div>

              {reviewing ? (
                <div role="group" aria-label={t("moveIt")} className="space-y-3">
                  <p className="font-medium">
                    {fill(t("heavyReview"), {
                      title: suggestion.title,
                      date: formatDate(localDate(1), locale),
                    })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={() => {
                        setReviewing(false);
                        onMove(suggestion);
                      }}
                    >
                      {t("heavyApply")}
                    </Button>
                    <Button autoFocus onClick={() => setReviewing(false)}>
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="primary" onClick={() => setReviewing(true)}>
                  {t("moveIt")}
                </Button>
              )}
            </div>
          )
        }
      >
        <p>{t(load.reason === "over_capacity" ? "heavyOverCapacity" : "heavyLongTasks")}</p>
        <p className="mt-1 font-medium">
          {fill(t("heavyNumbers"), {
            planned: load.total_minutes,
            capacity: load.capacity_minutes,
          })}
        </p>
      </Notice>
    </section>
  );
}
