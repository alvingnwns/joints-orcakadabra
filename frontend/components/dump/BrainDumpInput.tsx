"use client";

import type { FormEvent } from "react";

import { useT } from "@/components/LocaleProvider";

export const MAX_DUMP_LENGTH = 5000; // same limit as the backend

type Props = {
  text: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  busy: boolean;
};

/** A large, calm textarea. Submitting is disabled while it's empty or the AI is working. */
export function BrainDumpInput({ text, onChange, onSubmit, busy }: Props) {
  const t = useT();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (text.trim() && !busy) onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-card bg-surface p-4 shadow-sm">
      <label htmlFor="brain-dump" className="block font-medium">
        {t("dumpLabel")}
      </label>
      <p id="brain-dump-hint" className="mt-1 text-sm text-muted">
        {t("dumpHint")}
      </p>
      <textarea
        id="brain-dump"
        aria-describedby="brain-dump-hint"
        value={text}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("dumpPlaceholder")}
        maxLength={MAX_DUMP_LENGTH}
        rows={8}
        readOnly={busy}
        className="mt-3 w-full rounded-xl border border-muted bg-surface p-3"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="mt-3 min-h-11 rounded-full bg-ink px-5 font-medium text-cream disabled:opacity-50"
      >
        {t("dumpSubmit")}
      </button>
    </form>
  );
}
