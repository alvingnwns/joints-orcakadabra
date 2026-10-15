"use client";

import { type FormEvent, useId, useState } from "react";

import { useT } from "@/components/LocaleProvider";
import { ImpactPicker } from "@/components/tasks/ImpactPicker";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import type { Task, TaskChanges } from "@/lib/tasks";

type Props = {
  task: Task;
  /** Saves only the fields that changed. Resolves to false if the save did not go through. */
  onSave: (changes: TaskChanges) => Promise<boolean>;
  onClose: () => void;
};

// Same limits as the backend (CP5).
const MAX_TITLE = 200;
const MIN_MINUTES = 5;
const MAX_MINUTES = 720;

/**
 * The one place to change a task's details. Mount it only while editing: it starts from the
 * task's current values each time. Nothing is lost silently: a failed save keeps the form, and
 * closing with unsaved changes asks first.
 */
export function EditTaskDialog({ task, onSave, onClose }: Props) {
  const t = useT();
  const titleId = useId();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [minutes, setMinutes] = useState(task.estimated_minutes?.toString() ?? "");
  const [impact, setImpact] = useState(task.impact_score);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const minutesNumber = minutes === "" ? null : Number(minutes);
  const titleError = !title.trim() ? t("editTitleRequired") : undefined;
  const minutesError =
    minutesNumber !== null &&
    (!Number.isInteger(minutesNumber) || minutesNumber < MIN_MINUTES || minutesNumber > MAX_MINUTES)
      ? t("editEstimateRange")
      : undefined;

  // Only what actually changed is sent, so an unchanged field is never rewritten.
  const changes: TaskChanges = {};
  if (title.trim() !== task.title) changes.title = title.trim();
  if ((description.trim() || null) !== (task.description ?? null)) {
    changes.description = description.trim() || null;
  }
  if ((dueDate || null) !== task.due_date) changes.due_date = dueDate || null;
  if (minutesNumber !== task.estimated_minutes) changes.estimated_minutes = minutesNumber;
  if (impact !== task.impact_score) changes.impact_score = impact;
  const dirty = Object.keys(changes).length > 0;

  function requestClose() {
    if (saving) return;
    if (dirty) setConfirmingDiscard(true);
    else onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSubmitted(true);
    if (titleError || minutesError) return;
    if (!dirty) {
      onClose();
      return;
    }

    setSaving(true);
    setFailed(false);
    const saved = await onSave(changes);
    setSaving(false);
    if (saved) onClose();
    else setFailed(true); // the form stays exactly as it was
  }

  return (
    <Dialog open onClose={requestClose} labelledBy={titleId} locked={saving}>
      <h2 id={titleId} className="text-section font-semibold">
        {t("editTitle")}
      </h2>

      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <Field label={t("taskTitleLabel")} error={submitted ? titleError : undefined}>
          {(control) => (
            <Input
              {...control}
              maxLength={MAX_TITLE}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
        </Field>

        <Field label={t("descriptionLabel")}>
          {(control) => (
            <Textarea
              {...control}
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          )}
        </Field>

        <Field label={t("dueDateLabel")}>
          {(control) => (
            <div className="flex gap-2">
              <Input
                {...control}
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
              {dueDate && <Button onClick={() => setDueDate("")}>{t("clearDate")}</Button>}
            </div>
          )}
        </Field>

        <Field label={t("estimateLabel")} error={submitted ? minutesError : undefined}>
          {(control) => (
            <Input
              {...control}
              type="number"
              inputMode="numeric"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={5}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          )}
        </Field>

        <ImpactPicker value={impact} onChange={setImpact} />

        {failed && <Notice tone="error">{t("editSaveError")}</Notice>}

        {confirmingDiscard ? (
          <Notice
            tone="attention"
            role="alert"
            title={t("editDiscardTitle")}
            action={
              <>
                <Button autoFocus onClick={() => setConfirmingDiscard(false)}>
                  {t("editDiscardKeep")}
                </Button>
                <Button variant="destructive" onClick={onClose}>
                  {t("editDiscardYes")}
                </Button>
              </>
            }
          />
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={requestClose} disabled={saving}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        )}
      </form>
    </Dialog>
  );
}
