"use client";

import { useId } from "react";

import { useT } from "@/components/LocaleProvider";

// Three friendly choices stored as impact_score 1 / 3 / 5 (A7). "Matters" is the default.
const CHOICES = [
  { value: 1, label: "impactSmall" },
  { value: 3, label: "impactMatters" },
  { value: 5, label: "impactReally" },
] as const;

type Props = { value: number; onChange: (value: number) => void };

/** "How much does it matter?" as three clear choices. Used by quick add and the edit dialog. */
export function ImpactPicker({ value, onChange }: Props) {
  const t = useT();
  const name = useId();

  // A task created elsewhere can have 2 or 4; show the nearest choice as selected.
  const selected = value <= 2 ? 1 : value >= 4 ? 5 : 3;

  return (
    <fieldset>
      <legend className="text-sm font-medium">{t("impactLegend")}</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {CHOICES.map((choice) => (
          <label
            key={choice.value}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-border-strong bg-surface px-4 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
          >
            <input
              type="radio"
              name={name}
              className="accent-primary"
              checked={selected === choice.value}
              onChange={() => onChange(choice.value)}
            />
            {t(choice.label)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
