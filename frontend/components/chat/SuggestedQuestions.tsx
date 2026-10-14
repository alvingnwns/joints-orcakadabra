"use client";

import { useT } from "@/components/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/en";

// The example questions from the design.
const SUGGESTIONS: TranslationKey[] = ["chatSuggestFirst", "chatSuggestTwoHours", "chatSuggestWait"];

/** Low-effort starting points: one tap asks the question. */
export function SuggestedQuestions({ onAsk, disabled }: { onAsk: (q: string) => void; disabled: boolean }) {
  const t = useT();

  return (
    <ul className="flex flex-wrap gap-2">
      {SUGGESTIONS.map((key) => (
        <li key={key}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAsk(t(key))}
            className="min-h-11 rounded-full border border-ink px-4 text-sm font-medium hover:bg-cream disabled:opacity-50"
          >
            {t(key)}
          </button>
        </li>
      ))}
    </ul>
  );
}
