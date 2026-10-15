"use client";

import { Illustration } from "@/components/illustrations/Illustration";
import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
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
    <section aria-labelledby="heavy-load-title">
      <Notice
        tone="attention"
        media={<Illustration name="heavy-load" width={112} className="mx-0 shrink-0" />}
        title={t("heavyLoadTitle")}
        titleAs="h2"
        titleId="heavy-load-title"
        action={
          suggestion && (
            <>
              <p className="text-sm">
                {t("delaySuggestion")} <strong>{suggestion.title}</strong>
              </p>
              <Button variant="primary" onClick={() => onMove(suggestion)}>
                {t("moveIt")}
              </Button>
            </>
          )
        }
      >
        {t(load.reason === "over_capacity" ? "heavyOverCapacity" : "heavyLongTasks")}
      </Notice>
    </section>
  );
}
