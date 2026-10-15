"use client";

import { useT } from "@/components/LocaleProvider";
import { LEVEL_STYLE } from "@/components/week/loadStyle";
import { fill } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/en";
import { LOAD_LABEL, type LoadLevel, loadLevel } from "@/lib/load";
import { cn } from "@/lib/cn";

export function loadLabel(totalMinutes: number, capacity: number, isHeavy: boolean): TranslationKey {
  return LOAD_LABEL[loadLevel(totalMinutes, capacity, isHeavy)];
}

type Props = {
  totalMinutes: number;
  capacity: number;
  isHeavy: boolean;
  /** Pass a level you already worked out, to keep a card and its bar in agreement. */
  level?: LoadLevel;
  /** Hide the words (the parent already shows them). The bar itself is decorative. */
  barOnly?: boolean;
};

/**
 * Load relative to the person's capacity: a bar, a word, and "90 of 240 minutes". The words are
 * always present, so color is never the only signal.
 */
export function LoadBar({ totalMinutes, capacity, isHeavy, level, barOnly }: Props) {
  const t = useT();
  const current = level ?? loadLevel(totalMinutes, capacity, isHeavy);
  const style = LEVEL_STYLE[current];
  const percent = Math.min(totalMinutes / capacity, 1) * 100;

  // Spans only: this sits inside the day button, which allows phrasing content only.
  return (
    <span className="block">
      <span aria-hidden="true" className="block h-2.5 overflow-hidden rounded-full bg-border">
        <span
          className={cn("block h-full rounded-full", style.bar)}
          style={{ width: `${percent}%` }}
        />
      </span>
      {!barOnly && (
        <>
          <span className={cn("mt-1.5 block text-sm font-semibold", style.date)}>
            {t(LOAD_LABEL[current])}
          </span>
          <span className={cn("block text-meta", style.muted)}>
            {fill(t("loadMinutes"), { planned: totalMinutes, capacity })}
          </span>
        </>
      )}
    </span>
  );
}
