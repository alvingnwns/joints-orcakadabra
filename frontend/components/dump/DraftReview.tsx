"use client";

import { useT } from "@/components/LocaleProvider";
import { DraftCard } from "@/components/dump/DraftCard";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import type { DraftFields } from "@/lib/dump";

export type EditableDraft = DraftFields & { key: number }; // stable React key while editing

type Props = {
  drafts: EditableDraft[];
  onChange: (draft: EditableDraft) => void;
  onRemove: (key: number) => void;
  onSave: () => void;
  onBack: () => void;
  saving: boolean;
  saveFailed: boolean;
};

/** The user stays in control: every draft can be edited or removed before anything is saved. */
export function DraftReview({ drafts, onChange, onRemove, onSave, onBack, saving, saveFailed }: Props) {
  const t = useT();
  const canSave = drafts.length > 0 && drafts.every((draft) => draft.title.trim()) && !saving;

  return (
    <section aria-labelledby="drafts-title" className="space-y-4">
      <div>
        <h2 id="drafts-title" className="text-section font-semibold">
          {t("draftsTitle")}
        </h2>
        <p className="text-sm text-text-secondary">{t("draftsIntro")}</p>
      </div>

      {drafts.length === 0 ? (
        <p className="text-text-secondary">{t("draftsNoneLeft")}</p>
      ) : (
        <ul className="space-y-3">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.key}
              draft={draft}
              onChange={(changed) => onChange({ ...changed, key: draft.key })}
              onRemove={() => onRemove(draft.key)}
            />
          ))}
        </ul>
      )}

      {saveFailed && <Notice tone="error">{t("draftsSaveError")}</Notice>}

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onSave} disabled={!canSave}>
          {t("draftsSave")}
        </Button>
        <Button onClick={onBack}>{t("draftsBack")}</Button>
      </div>
    </section>
  );
}
