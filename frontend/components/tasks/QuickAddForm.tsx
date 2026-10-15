"use client";

import { Plus } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";

import { useLocale } from "@/components/LocaleProvider";
import { ImpactPicker } from "@/components/tasks/ImpactPicker";
import { SuggestTime } from "@/components/tasks/SuggestTime";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { fill, formatDate } from "@/lib/i18n";
import type { NewTask } from "@/lib/tasks";

type Props = {
  /** Should reject if the task could not be saved, so the form can keep what was typed. */
  onAdd: (task: NewTask) => Promise<void>;
  /** A date ("YYYY-MM-DD") new tasks start with, e.g. the day selected in the week view. */
  defaultDueDate?: string;
};

export function QuickAddForm({ onAdd, defaultDueDate }: Props) {
  const { t, locale } = useLocale();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate ?? "");
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
        ...(description.trim() && { description: description.trim() }),
        ...(dueDate && { due_date: dueDate }),
        ...(minutes && { estimated_minutes: Number(minutes) }),
      });
      setTitle("");
      setDescription("");
      setDueDate(defaultDueDate ?? "");
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
        <div className="mt-2 flex flex-wrap gap-2">
          <Input
            ref={titleRef}
            id="new-task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            className="min-w-[min(12rem,100%)] flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            icon={Plus}
            disabled={saving || !title.trim()}
            className="whitespace-nowrap"
          >
            {t("addTaskButton")}
          </Button>
        </div>
        {defaultDueDate && dueDate === defaultDueDate && (
          <p className="mt-2 text-sm text-text-secondary">
            {fill(t("addingTo"), { date: formatDate(defaultDueDate, locale) })}
          </p>
        )}

        <details className="mt-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm text-text-secondary">
            {t("moreDetails")}
          </summary>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <Field label={t("descriptionLabel")} className="sm:col-span-2">
              {(control) => (
                <Textarea
                  {...control}
                  rows={2}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              )}
            </Field>
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
            <div className="sm:col-span-2">
              <SuggestTime
                title={title}
                description={description}
                onUse={(suggested) => setMinutes(String(suggested))}
              />
            </div>
            <div className="sm:col-span-2">
              <ImpactPicker value={impact} onChange={setImpact} />
            </div>
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
