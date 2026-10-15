"use client";

import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import type { TranslationKey } from "@/lib/i18n/en";

// The example questions from the design.
const SUGGESTIONS: TranslationKey[] = [
  "chatSuggestFirst",
  "chatSuggestTwoHours",
  "chatSuggestWait",
  "chatSuggestMove",
];

/** Low-effort starting points: one tap asks the question. */
export function SuggestedQuestions({ onAsk, disabled }: { onAsk: (q: string) => void; disabled: boolean }) {
  const t = useT();

  return (
    <ul className="flex flex-wrap gap-2">
      {SUGGESTIONS.map((key) => (
        <li key={key}>
          <Button disabled={disabled} onClick={() => onAsk(t(key))}>
            {t(key)}
          </Button>
        </li>
      ))}
    </ul>
  );
}
