"use client";

import { Plus } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";

import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import type { NewTask } from "@/lib/tasks";

// Three friendly choices stored as impact_score 1 / 3 / 5 (A7). "Matters" is the default.
const IMPACT_CHOICES = [
  { value: 1, label: "impactSmall" },
  { value: 3, label: "impactMatters" },
  { value: 5, label: "impactReally" },
] as const;

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
    <Card>
      <form onSubmit={handleSubmit}>
        <label htmlFor="new-task-title" className="block font-medium">
          {t("addTaskLabel")}
        </label>
        <div className="mt-2 flex gap-2">
          <Input
            ref={titleRef}
            id="new-task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
          />
          <Button type="submit" variant="primary" icon={Plus} disabled={saving || !title.trim()}>
            {t("addTaskButton")}
          </Button>
        </div>

        <details className="mt-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm text-text-secondary">
            {t("moreDetails")}
          </summary>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <Field label={t("dueDateLabel")}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              )}
            </Field>
            <Field label={t("estimateLabel")}>
              {(control) => (
                <Input
                  {...control}
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={720}
                  step={5}
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                />
              )}
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium">{t("impactLegend")}</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {IMPACT_CHOICES.map((choice) => (
                  <label
                    key={choice.value}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-border-strong bg-surface px-4 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
                  >
                    <input
                      type="radio"
                      name="impact"
                      className="accent-primary"
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
          <Notice tone="error" className="mt-3">
            {t("addError")}
          </Notice>
        )}
      </form>
    </Card>
  );
}
