"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { BrainDumpInput } from "@/components/dump/BrainDumpInput";
import { DraftReview, type EditableDraft } from "@/components/dump/DraftReview";
import { Illustration } from "@/components/illustrations/Illustration";
import { useLocale } from "@/components/LocaleProvider";
import { buttonClasses } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { ApiError } from "@/lib/api";
import { parseBrainDump, saveDrafts } from "@/lib/dump";
import { localDate } from "@/lib/tasks";

type Phase = "input" | "parsing" | "review" | "saving" | "saved";
type ParseError = "ai" | "none" | null;

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
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-display font-semibold">{t("dumpTitle")}</h1>

      {/* Announces progress and results to screen readers. */}
      <p role="status" className={phase === "parsing" ? "text-text-secondary" : "sr-only"}>
        {phase === "parsing" && t("dumpParsing")}
        {reviewing && t("draftsTitle")}
        {phase === "saved" && t("draftsSaved")}
      </p>

      {(phase === "input" || phase === "parsing") && (
        <>
          <Illustration
            name={phase === "parsing" ? "untangling" : "brain-dump"}
            width={180}
            className={phase === "parsing" ? "motion-safe:animate-pulse" : ""}
          />
          <BrainDumpInput
            text={text}
            onChange={setText}
            onSubmit={() => void handleParse()}
            busy={phase === "parsing"}
          />
          {parseError === "ai" && (
            <Notice
              tone="error"
              action={
                <Link href="/" className={buttonClasses()}>
                  {t("dumpManual")}
                </Link>
              }
            >
              {t("dumpAiError")}
            </Notice>
          )}
          {parseError === "none" && <Notice tone="error">{t("dumpNoTasks")}</Notice>}
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
        <Notice
          tone="success"
          action={
            <Link href="/" className={buttonClasses()}>
              {t("draftsSeeToday")}
            </Link>
          }
        >
          {t("draftsSaved")}
        </Notice>
      )}
    </div>
  );
}
