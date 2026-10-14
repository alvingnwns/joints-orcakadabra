"use client";

import { type FormEvent, useRef, useState } from "react";

import { useT } from "@/components/LocaleProvider";
import type { NewTask } from "@/lib/tasks";

// Three friendly choices stored as impact_score 1 / 3 / 5 (A7). "Matters" is the default.
const IMPACT_CHOICES = [
  { value: 1, label: "impactSmall" },
  { value: 3, label: "impactMatters" },
  { value: 5, label: "impactReally" },
] as const;

const inputClass = "min-h-11 w-full rounded-xl border border-muted bg-surface px-3";

type Props = {
  /** Should reject if the task could not be saved, so the form can keep what was typed. */
  onAdd: (task: NewTask) => Promise<void>;
};

export function QuickAddForm({ onAdd }: Props) {
  const t = useT();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [minutes, setMinutes] = useState("");
  const [impact, setImpact] = useState(3);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setFailed(false);
    try {
      await onAdd({
        title: trimmed,
        impact_score: impact,
        ...(dueDate && { due_date: dueDate }),
        ...(minutes && { estimated_minutes: Number(minutes) }),
      });
      setTitle("");
      setDueDate("");
      setMinutes("");
      setImpact(3);
      titleRef.current?.focus();
    } catch {
      setFailed(true); // everything typed stays in the form
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-card bg-surface p-4 shadow-sm">
      <label htmlFor="new-task-title" className="block font-medium">
        {t("addTaskLabel")}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          ref={titleRef}
          id="new-task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="min-h-11 rounded-full bg-ink px-5 font-medium text-cream disabled:opacity-50"
        >
          {t("addTaskButton")}
        </button>
      </div>

      <details className="mt-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm text-muted">
          {t("moreDetails")}
        </summary>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="new-task-due" className="block text-sm">
              {t("dueDateLabel")}
            </label>
            <input
              id="new-task-due"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label htmlFor="new-task-minutes" className="block text-sm">
              {t("estimateLabel")}
            </label>
            <input
              id="new-task-minutes"
              type="number"
              inputMode="numeric"
              min={5}
              max={720}
              step={5}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm">{t("impactLegend")}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {IMPACT_CHOICES.map((choice) => (
                <label
                  key={choice.value}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-muted px-4 has-[:checked]:border-ink has-[:checked]:bg-sky"
                >
                  <input
                    type="radio"
                    name="impact"
                    checked={impact === choice.value}
                    onChange={() => setImpact(choice.value)}
                  />
                  {t(choice.label)}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </details>

      {failed && (
        <p role="alert" className="mt-3 rounded-xl bg-peach px-3 py-2 text-sm">
          {t("addError")}
        </p>
      )}
    </form>
  );
}
