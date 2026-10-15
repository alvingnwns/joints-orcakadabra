"use client";

import { CalendarClock } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";

import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import type { TranslationKey } from "@/lib/i18n/en";
import { type Task, type TaskChanges, localDate } from "@/lib/tasks";

export type UpdateTask = (task: Task, changes: TaskChanges, message: TranslationKey) => void;

type Props = { task: Task; onUpdate: UpdateTask };
type Mode = "closed" | "menu" | "pickDay" | "smaller";

/** Ways to change plans without guilt: move, save for later, or make a task smaller (CP8). */
export function TaskActions({ task, onUpdate }: Props) {
  const t = useT();
  const formId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<Mode>("closed");
  const [day, setDay] = useState("");
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("");

  if (task.status === "done") return null;

  if (task.status === "deferred") {
    return (
      <Button onClick={() => onUpdate(task, { status: "todo" }, "broughtBack")}>
        {t("actionBringBack")}
      </Button>
    );
  }

  function apply(changes: TaskChanges, message: TranslationKey) {
    setMode("closed");
    onUpdate(task, changes, message);
    triggerRef.current?.focus();
  }

  function openPickDay() {
    setDay(task.due_date ?? localDate(1));
    setMode("pickDay");
  }

  function openSmaller() {
    setTitle(task.title);
    setMinutes(task.estimated_minutes?.toString() ?? "");
    setMode("smaller");
  }

  function submitDay(event: FormEvent) {
    event.preventDefault();
    if (day) apply({ due_date: day }, "movedDay");
  }

  function submitSmaller(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    apply({ title: trimmed, estimated_minutes: minutes ? Number(minutes) : null }, "madeSmaller");
  }

  const cancelButton = <Button onClick={() => setMode("menu")}>{t("cancel")}</Button>;

  return (
    <div className="mt-3">
      <Button
        ref={triggerRef}
        icon={CalendarClock}
        aria-expanded={mode !== "closed"}
        aria-controls={`${formId}-panel`}
        onClick={() => setMode(mode === "closed" ? "menu" : "closed")}
      >
        {t("changePlans")}
      </Button>

      {mode !== "closed" && (
        <div id={`${formId}-panel`} className="mt-3 rounded-control bg-surface-muted p-3">
          {mode === "menu" && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => apply({ due_date: localDate(1) }, "movedTomorrow")}>
                {t("actionTomorrow")}
              </Button>
              <Button onClick={openPickDay}>{t("actionPickDay")}</Button>
              <Button onClick={() => apply({ status: "deferred" }, "movedLater")}>
                {t("actionLater")}
              </Button>
              <Button onClick={openSmaller}>{t("actionSmaller")}</Button>
            </div>
          )}

          {mode === "pickDay" && (
            <form onSubmit={submitDay} className="space-y-3">
              <Field label={t("newDayLabel")}>
                {(control) => (
                  <Input
                    {...control}
                    type="date"
                    autoFocus
                    required
                    min={localDate(0)}
                    value={day}
                    onChange={(event) => setDay(event.target.value)}
                  />
                )}
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="primary" disabled={!day}>
                  {t("save")}
                </Button>
                {cancelButton}
              </div>
            </form>
          )}

          {mode === "smaller" && (
            <form onSubmit={submitSmaller} className="space-y-3">
              <Field label={t("smallerTitleLabel")}>
                {(control) => (
                  <Input
                    {...control}
                    autoFocus
                    maxLength={200}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
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
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="primary" disabled={!title.trim()}>
                  {t("save")}
                </Button>
                {cancelButton}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
