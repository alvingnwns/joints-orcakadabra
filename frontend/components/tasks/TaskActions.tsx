"use client";

import { type FormEvent, useId, useRef, useState } from "react";

import { useT } from "@/components/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/en";
import { type Task, type TaskChanges, localDate } from "@/lib/tasks";

export type UpdateTask = (task: Task, changes: TaskChanges, message: TranslationKey) => void;

type Props = { task: Task; onUpdate: UpdateTask };
type Mode = "closed" | "menu" | "pickDay" | "smaller";

const buttonClass =
  "min-h-11 rounded-full border border-ink px-4 text-sm font-medium hover:bg-cream disabled:opacity-50";
const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3";

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
      <button
        type="button"
        onClick={() => onUpdate(task, { status: "todo" }, "broughtBack")}
        className={buttonClass}
      >
        {t("actionBringBack")}
      </button>
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

  const cancelButton = (
    <button type="button" onClick={() => setMode("menu")} className={buttonClass}>
      {t("cancel")}
    </button>
  );

  return (
    <div className="mt-3">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={mode !== "closed"}
        aria-controls={`${formId}-panel`}
        onClick={() => setMode(mode === "closed" ? "menu" : "closed")}
        className={buttonClass}
      >
        {t("changePlans")}
      </button>

      {mode !== "closed" && (
        <div id={`${formId}-panel`} className="mt-3 rounded-xl bg-cream p-3">
          {mode === "menu" && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => apply({ due_date: localDate(1) }, "movedTomorrow")}
                className={buttonClass}
              >
                {t("actionTomorrow")}
              </button>
              <button type="button" onClick={openPickDay} className={buttonClass}>
                {t("actionPickDay")}
              </button>
              <button
                type="button"
                onClick={() => apply({ status: "deferred" }, "movedLater")}
                className={buttonClass}
              >
                {t("actionLater")}
              </button>
              <button type="button" onClick={openSmaller} className={buttonClass}>
                {t("actionSmaller")}
              </button>
            </div>
          )}

          {mode === "pickDay" && (
            <form onSubmit={submitDay} className="space-y-3">
              <div>
                <label htmlFor={`${formId}-day`} className="block text-sm">
                  {t("newDayLabel")}
                </label>
                <input
                  id={`${formId}-day`}
                  type="date"
                  autoFocus
                  required
                  min={localDate(0)}
                  value={day}
                  onChange={(event) => setDay(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={!day} className={buttonClass}>
                  {t("save")}
                </button>
                {cancelButton}
              </div>
            </form>
          )}

          {mode === "smaller" && (
            <form onSubmit={submitSmaller} className="space-y-3">
              <div>
                <label htmlFor={`${formId}-title`} className="block text-sm">
                  {t("smallerTitleLabel")}
                </label>
                <input
                  id={`${formId}-title`}
                  autoFocus
                  maxLength={200}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor={`${formId}-minutes`} className="block text-sm">
                  {t("estimateLabel")}
                </label>
                <input
                  id={`${formId}-minutes`}
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={720}
                  step={5}
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={!title.trim()} className={buttonClass}>
                  {t("save")}
                </button>
                {cancelButton}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
