"use client";

import { Trash2 } from "lucide-react";

import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import type { Draft } from "@/lib/dump";

type Props = {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onRemove: () => void;
};

/** One editable draft. Guessed or unclear details are highlighted with the AI's note. */
export function DraftCard({ draft, onChange, onRemove }: Props) {
  const t = useT();

  return (
    <Card as="li" tone={draft.needs_confirmation ? "attention" : "surface"}>
      {draft.needs_confirmation && (
        <Notice tone="attention" className="mb-3">
          <p>
            <strong>{t("draftCheck")}</strong>
            {draft.note && <> — {draft.note}</>}
          </p>
        </Notice>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("draftTitleLabel")} className="sm:col-span-2">
          {(control) => (
            <Input
              {...control}
              value={draft.title}
              maxLength={200}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
            />
          )}
        </Field>
        <Field label={t("dueDateLabel")}>
          {(control) => (
            <Input
              {...control}
              type="date"
              value={draft.due_date ?? ""}
              onChange={(event) => onChange({ ...draft, due_date: event.target.value || null })}
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
              value={draft.estimated_minutes ?? ""}
              onChange={(event) =>
                onChange({
                  ...draft,
                  estimated_minutes: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          )}
        </Field>
      </div>
      <Button variant="quiet" icon={Trash2} onClick={onRemove} className="mt-3">
        {t("draftRemove")}
        {/* Screen readers hear which draft this removes. */}
        <span className="sr-only">: {draft.title}</span>
      </Button>
    </Card>
  );
}
