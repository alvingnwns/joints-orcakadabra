"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { useLocale } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Mascot } from "@/components/ui/Mascot";
import { Notice } from "@/components/ui/Notice";
import { useOptionalWorkspace } from "@/components/WorkspaceProvider";
import { estimateDuration } from "@/lib/estimate";
import { fill } from "@/lib/i18n";

type Props = {
  title: string;
  description: string;
  /** Called when the person accepts the suggestion; they can still change the number after. */
  onUse: (minutes: number) => void;
};

type State =
  | { status: "idle" }
  | { status: "thinking" }
  | { status: "failed" }
  | { status: "ready"; minutes: number; reason: string };

/**
 * "Suggest a time": the AI reads what the task actually is and proposes a duration with a short
 * reason. It only suggests; the number is used only if the person chooses it.
 */
export function SuggestTime({ title, description, onUse }: Props) {
  const { t, locale } = useLocale();
  const workspaceId = useOptionalWorkspace();
  const [state, setState] = useState<State>({ status: "idle" });

  // Asking the AI needs a workspace; without one (e.g. a form shown on its own) there is no button.
  if (!workspaceId) return null;

  async function suggest(id: string) {
    setState({ status: "thinking" });
    try {
      const result = await estimateDuration(id, {
        title: title.trim(),
        ...(description.trim() && { description: description.trim() }),
        locale,
      });
      setState({
        status: "ready",
        minutes: result.estimated_minutes,
        reason: result.estimate_reason,
      });
    } catch {
      setState({ status: "failed" });
    }
  }

  return (
    <div className="space-y-2">
      <Button
        icon={Sparkles}
        onClick={() => void suggest(workspaceId)}
        disabled={!title.trim() || state.status === "thinking"}
      >
        {t("suggestTime")}
      </Button>

      {state.status === "thinking" && (
        <p role="status" className="flex items-center gap-2 text-sm text-text-secondary">
          <Mascot mood="think" size={32} className="motion-safe:animate-pulse" />
          {t("suggesting")}
        </p>
      )}

      {state.status === "failed" && <Notice tone="error">{t("suggestError")}</Notice>}

      {state.status === "ready" && (
        <div role="status" className="rounded-card bg-wash p-3">
          <p className="font-bold text-primary">
            {fill(t("suggestedTime"), { n: state.minutes })}
          </p>
          <p className="mt-0.5 text-sm">{state.reason}</p>
          <p className="mt-1 text-meta text-text-secondary">{t("suggestHint")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => {
                onUse(state.minutes);
                setState({ status: "idle" });
              }}
            >
              {fill(t("suggestUse"), { n: state.minutes })}
            </Button>
            <Button onClick={() => setState({ status: "idle" })}>{t("close")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
