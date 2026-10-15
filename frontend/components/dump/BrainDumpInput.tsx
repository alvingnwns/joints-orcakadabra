"use client";

import { Sparkles } from "lucide-react";
import type { FormEvent } from "react";

import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Textarea } from "@/components/ui/Field";

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
    <Card>
      <form onSubmit={handleSubmit}>
        <Field label={t("dumpLabel")} hint={t("dumpHint")}>
          {(control) => (
            <Textarea
              {...control}
              value={text}
              onChange={(event) => onChange(event.target.value)}
              placeholder={t("dumpPlaceholder")}
              maxLength={MAX_DUMP_LENGTH}
              rows={8}
              readOnly={busy}
            />
          )}
        </Field>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon={Sparkles}
          disabled={busy || !text.trim()}
          className="mt-3"
        >
          {t("dumpSubmit")}
        </Button>
      </form>
    </Card>
  );
}
