"use client";

import { Pencil, Sparkles, Trash2 } from "lucide-react";

import { useT } from "@/components/LocaleProvider";
import { ImpactPicker } from "@/components/tasks/ImpactPicker";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import type { DraftFields } from "@/lib/dump";

type Props = {
  draft: DraftFields;
  onChange: (draft: DraftFields) => void;
  onRemove: () => void;
};

/**
 * One editable draft: the same fields as manual entry. It is labelled "Not saved yet" so it is
 * never mistaken for a task. Guessed or unclear details are highlighted with the AI's note.
 */
export function DraftCard({ draft, onChange, onRemove }: Props) {
  const t = useT();

  return (
    <Card as="li" tone={draft.needs_confirmation ? "attention" : "surface"}>
      <Badge icon={Pencil} className="mb-3">
        {t("draftNotSaved")}
      </Badge>
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
        <Field
          label={t("estimateLabel")}
          hint={
            draft.estimate_is_guess && draft.estimate_reason ? (
              <span className="flex items-start gap-1.5">
                <Icon icon={Sparkles} size={15} className="mt-0.5 shrink-0 text-primary" />
                <span>
                  <strong>{t("aiEstimate")}:</strong> {draft.estimate_reason}
                </span>
              </span>
            ) : undefined
          }
        >
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
                  // Once the person changes the number, the AI's reason no longer applies.
                  estimate_is_guess: false,
                })
              }
            />
          )}
        </Field>
        <div className="sm:col-span-2">
          <ImpactPicker
            value={draft.impact_score}
            onChange={(impact_score) => onChange({ ...draft, impact_score })}
          />
        </div>
      </div>
      <Button variant="quiet" icon={Trash2} onClick={onRemove} className="mt-3">
        {t("draftRemove")}
        {/* Screen readers hear which draft this removes. */}
        <span className="sr-only">: {draft.title}</span>
      </Button>
    </Card>
  );
}
