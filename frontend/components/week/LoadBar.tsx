"use client";

import { useT } from "@/components/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/en";

const BUSY_RATIO = 0.75; // from 75% of capacity a day reads as "fairly busy"

export function loadLabel(totalMinutes: number, capacity: number, isHeavy: boolean): TranslationKey {
  if (totalMinutes === 0) return "loadNone";
  if (isHeavy) return "loadFull";
  return totalMinutes / capacity >= BUSY_RATIO ? "loadBusy" : "loadLight";
}

type Props = { totalMinutes: number; capacity: number; isHeavy: boolean };

/** Load relative to capacity. The text label is always shown, so color is never the only cue. */
export function LoadBar({ totalMinutes, capacity, isHeavy }: Props) {
  const t = useT();
  const percent = Math.min(totalMinutes / capacity, 1) * 100;

  // Spans only: this sits inside the day button, which allows phrasing content only.
  return (
    <span className="block">
      <span aria-hidden="true" className="block h-2 overflow-hidden rounded-full bg-line">
        <span
          className={`block h-full rounded-full ${isHeavy ? "bg-ink/70" : "bg-ink/30"}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="mt-1 block text-sm">{t(loadLabel(totalMinutes, capacity, isHeavy))}</span>
      <span className="block text-xs text-muted">
        {totalMinutes} / {capacity} {t("minutesShort")}
      </span>
    </span>
  );
}
