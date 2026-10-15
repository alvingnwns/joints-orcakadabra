"use client";

import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";

import { useT } from "@/components/LocaleProvider";
import { ConfirmDeleteDialog } from "@/components/tasks/ConfirmDeleteDialog";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import type { TranslationKey } from "@/lib/i18n/en";
import { type Task, type TaskChanges, localDate } from "@/lib/tasks";

export type UpdateTask = (task: Task, changes: TaskChanges, message: TranslationKey) => void;
export type EditTask = (task: Task, changes: TaskChanges) => Promise<boolean>;

type Props = {
  task: Task;
  onUpdate: UpdateTask;
  onEdit: EditTask;
  onDelete: (task: Task) => void;
};
type Mode = "closed" | "menu" | "pickDay";

/**
 * One "More" menu per task: edit, move, save for later, delete. Moving and saving for later are
 * lightweight (they show a message with Undo); editing and deleting open a dialog.
 */
export function TaskActions({ task, onUpdate, onEdit, onDelete }: Props) {
  const t = useT();
  const formId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<Mode>("closed");
  const [day, setDay] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const active = task.status === "todo" || task.status === "in_progress";
  const deferred = task.status === "deferred";

  function apply(changes: TaskChanges, message: TranslationKey) {
    setMode("closed");
    onUpdate(task, changes, message);
    triggerRef.current?.focus();
  }

  function openPickDay() {
    setDay(task.due_date ?? localDate(1));
    setMode("pickDay");
  }

  function submitDay(event: FormEvent) {
    event.preventDefault();
    if (day) apply({ due_date: day }, "movedDay");
  }

  // A dialog closes without saving: put keyboard focus back on the button that opened it.
  function closeEdit() {
    setEditing(false);
    editRef.current?.focus();
  }

  async function saveEdit(changes: TaskChanges) {
    const saved = await onEdit(task, changes);
    if (saved) setMode("closed"); // the card may have moved or re-sorted
    return saved;
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {deferred && (
          <Button onClick={() => onUpdate(task, { status: "todo" }, "broughtBack")}>
            {t("actionBringBack")}
          </Button>
        )}
        <Button
          ref={triggerRef}
          icon={Ellipsis}
          aria-expanded={mode !== "closed"}
          aria-controls={`${formId}-panel`}
          onClick={() => setMode(mode === "closed" ? "menu" : "closed")}
        >
          {t("moreActions")}
        </Button>
      </div>

      {mode !== "closed" && (
        <div id={`${formId}-panel`} className="mt-3 rounded-control bg-surface-muted p-3">
          {mode === "menu" && (
            <div className="flex flex-wrap gap-2">
              <Button ref={editRef} icon={Pencil} onClick={() => setEditing(true)}>
                {t("actionEdit")}
              </Button>
              {active && (
                <>
                  <Button onClick={() => apply({ due_date: localDate(1) }, "movedTomorrow")}>
                    {t("actionTomorrow")}
                  </Button>
                  <Button onClick={openPickDay}>{t("actionPickDay")}</Button>
                  <Button onClick={() => apply({ status: "deferred" }, "movedLater")}>
                    {t("actionLater")}
                  </Button>
                </>
              )}
              <Button ref={deleteRef} icon={Trash2} onClick={() => setDeleting(true)}>
                {t("deleteButton")}
              </Button>
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
                <Button onClick={() => setMode("menu")}>{t("cancel")}</Button>
              </div>
            </form>
          )}
        </div>
      )}

      {editing && <EditTaskDialog task={task} onSave={saveEdit} onClose={closeEdit} />}
      {deleting && (
        <ConfirmDeleteDialog
          task={task}
          onClose={() => {
            setDeleting(false);
            deleteRef.current?.focus();
          }}
          onConfirm={() => {
            setDeleting(false);
            onDelete(task);
          }}
        />
      )}
    </div>
  );
}
