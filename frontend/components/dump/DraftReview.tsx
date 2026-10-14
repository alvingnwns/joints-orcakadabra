"use client";

import { useT } from "@/components/LocaleProvider";
import { DraftCard } from "@/components/dump/DraftCard";
import type { Draft } from "@/lib/dump";

export type EditableDraft = Draft & { key: number }; // stable React key while editing

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
        <h2 id="drafts-title" className="text-lg font-semibold">
          {t("draftsTitle")}
        </h2>
        <p className="text-sm text-muted">{t("draftsIntro")}</p>
      </div>

      {drafts.length === 0 ? (
        <p className="text-muted">{t("draftsNoneLeft")}</p>
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

      {saveFailed && (
        <p role="alert" className="rounded-xl bg-peach px-3 py-2 text-sm">
          {t("draftsSaveError")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="min-h-11 rounded-full bg-ink px-5 font-medium text-cream disabled:opacity-50"
        >
          {t("draftsSave")}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-full border border-ink px-5 font-medium hover:bg-surface"
        >
          {t("draftsBack")}
        </button>
      </div>
    </section>
  );
}
