"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { BrainDumpInput } from "@/components/dump/BrainDumpInput";
import { DraftReview, type EditableDraft } from "@/components/dump/DraftReview";
import { useLocale } from "@/components/LocaleProvider";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { ApiError } from "@/lib/api";
import { parseBrainDump, saveDrafts } from "@/lib/dump";
import { localDate } from "@/lib/tasks";

type Phase = "input" | "parsing" | "review" | "saving" | "saved";
type ParseError = "ai" | "none" | null;

const linkClass =
  "inline-flex min-h-11 items-center rounded-full border border-ink px-4 font-medium hover:bg-surface";

/** Brain dump → AI drafts → review → save. The typed text is never lost on an error. */
export function BrainDumpView() {
  const { t, locale } = useLocale();
  const workspaceId = useWorkspace();
  const nextKey = useRef(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [parseError, setParseError] = useState<ParseError>(null);
  const [drafts, setDrafts] = useState<EditableDraft[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);

  async function handleParse() {
    setPhase("parsing");
    setParseError(null);
    try {
      const result = await parseBrainDump(workspaceId, text.trim(), localDate(0), locale);
      setDrafts(result.drafts.map((draft) => ({ ...draft, key: nextKey.current++ })));
      setSaveFailed(false);
      setPhase("review");
    } catch (error) {
      // 422 means the AI found no tasks; everything else is "the helper is unavailable".
      setParseError(error instanceof ApiError && error.status === 422 ? "none" : "ai");
      setPhase("input");
    }
  }

  async function handleSave() {
    setPhase("saving");
    setSaveFailed(false);
    try {
      await saveDrafts(
        workspaceId,
        drafts.map((draft) => ({
          title: draft.title.trim(),
          impact_score: 3,
          ...(draft.due_date && { due_date: draft.due_date }),
          ...(draft.estimated_minutes && { estimated_minutes: draft.estimated_minutes }),
        })),
      );
      setText("");
      setPhase("saved");
    } catch {
      setSaveFailed(true); // the drafts stay as they are
      setPhase("review");
    }
  }

  const reviewing = phase === "review" || phase === "saving";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("dumpTitle")}</h1>

      {/* Announces progress and results to screen readers. */}
      <p role="status" className={phase === "parsing" ? "text-muted" : "sr-only"}>
        {phase === "parsing" && t("dumpParsing")}
        {reviewing && t("draftsTitle")}
        {phase === "saved" && t("draftsSaved")}
      </p>

      {(phase === "input" || phase === "parsing") && (
        <>
          <BrainDumpInput
            text={text}
            onChange={setText}
            onSubmit={() => void handleParse()}
            busy={phase === "parsing"}
          />
          {parseError === "ai" && (
            <div role="alert" className="rounded-card bg-peach p-4">
              <p>{t("dumpAiError")}</p>
              <Link href="/" className={`mt-3 ${linkClass}`}>
                {t("dumpManual")}
              </Link>
            </div>
          )}
          {parseError === "none" && (
            <p role="alert" className="rounded-card bg-peach p-4">
              {t("dumpNoTasks")}
            </p>
          )}
        </>
      )}

      {reviewing && (
        <DraftReview
          drafts={drafts}
          onChange={(changed) =>
            setDrafts((current) =>
              current.map((draft) => (draft.key === changed.key ? changed : draft)),
            )
          }
          onRemove={(key) => setDrafts((current) => current.filter((draft) => draft.key !== key))}
          onSave={() => void handleSave()}
          onBack={() => setPhase("input")}
          saving={phase === "saving"}
          saveFailed={saveFailed}
        />
      )}

      {phase === "saved" && (
        <div className="rounded-card bg-mint p-4">
          <p>{t("draftsSaved")}</p>
          <Link href="/" className={`mt-3 ${linkClass}`}>
            {t("draftsSeeToday")}
          </Link>
        </div>
      )}
    </div>
  );
}
