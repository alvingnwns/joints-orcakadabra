"use client";

import { useId } from "react";

import { useT } from "@/components/LocaleProvider";
import type { Draft } from "@/lib/dump";

const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-muted bg-surface px-3";

type Props = {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onRemove: () => void;
};

/** One editable draft. Guessed or unclear details are highlighted with the AI's note. */
export function DraftCard({ draft, onChange, onRemove }: Props) {
  const t = useT();
  const id = useId();

  return (
    <li
      className={`rounded-card bg-surface p-4 shadow-sm ${
        draft.needs_confirmation ? "border-2 border-peach" : ""
      }`}
    >
      {draft.needs_confirmation && (
        <p className="mb-3 rounded-xl bg-peach px-3 py-2 text-sm">
          <strong>{t("draftCheck")}</strong>
          {draft.note && <> — {draft.note}</>}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-title`} className="block text-sm">
            {t("draftTitleLabel")}
          </label>
          <input
            id={`${id}-title`}
            value={draft.title}
            maxLength={200}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${id}-due`} className="block text-sm">
            {t("dueDateLabel")}
          </label>
          <input
            id={`${id}-due`}
            type="date"
            value={draft.due_date ?? ""}
            onChange={(event) => onChange({ ...draft, due_date: event.target.value || null })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${id}-minutes`} className="block text-sm">
            {t("estimateLabel")}
          </label>
          <input
            id={`${id}-minutes`}
            type="number"
            inputMode="numeric"
            min={5}
            max={720}
            step={5}
            value={draft.estimated_minutes ?? ""}
            onChange={(event) =>
              onChange({
                ...draft,
                estimated_minutes: event.target.value ? Number(event.target.value) : null,
              })
            }
            className={inputClass}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-3 min-h-11 rounded-full border border-ink px-4 text-sm font-medium hover:bg-cream"
      >
        {t("draftRemove")}
        {/* Screen readers hear which draft this removes. */}
        <span className="sr-only">: {draft.title}</span>
      </button>
    </li>
  );
}
