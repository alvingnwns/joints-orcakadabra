"use client";

import { Illustration } from "@/components/illustrations/Illustration";
import { useT } from "@/components/LocaleProvider";
import type { HeavyLoad, ScheduledTask } from "@/lib/schedule";

type Props = {
  load: HeavyLoad;
  /** The task the backend suggests moving (C5); the notice always pairs with it. */
  suggestion: ScheduledTask | null;
  onMove: (task: ScheduledTask) => void;
};

/** A calm "full day" notice with one concrete thing to move. Never alarming. */
export function HeavyLoadNotice({ load, suggestion, onMove }: Props) {
  const t = useT();

  return (
    <section
      aria-labelledby="heavy-load-title"
      className="flex flex-col gap-4 rounded-card bg-peach p-4 sm:flex-row sm:items-center"
    >
      <Illustration name="heavy-load" width={112} className="shrink-0 sm:mx-0" />
      <div>
      <h2 id="heavy-load-title" className="font-semibold">
        {t("heavyLoadTitle")}
      </h2>
      <p className="mt-1">
        {t(load.reason === "over_capacity" ? "heavyOverCapacity" : "heavyLongTasks")}
      </p>
      {suggestion && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p>
            {t("delaySuggestion")} <strong>{suggestion.title}</strong>
          </p>
          <button
            type="button"
            onClick={() => onMove(suggestion)}
            className="min-h-11 rounded-full bg-ink px-4 text-sm font-medium text-cream"
          >
            {t("moveIt")}
          </button>
        </div>
      )}
      </div>
    </section>
  );
}
