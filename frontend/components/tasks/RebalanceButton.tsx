"use client";

import { CalendarClock } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { useLocale } from "@/components/LocaleProvider";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLoad } from "@/components/useLoad";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { fill, formatDate } from "@/lib/i18n";
import { formatDuration } from "@/lib/load";
import { isEmptyPlan, rebalance } from "@/lib/rebalance";
import { localDate } from "@/lib/tasks";

type Props = {
  /** Called after the dialog closes, if anything was rearranged, so the page can reload. */
  onDone: () => void;
  variant?: ButtonVariant;
};

/**
 * "Rearrange my days": shows how the work would be spread out (what moves, which long tasks
 * split) and changes nothing until the person confirms.
 */
export function RebalanceButton({ onDone, variant = "primary" }: Props) {
  const { t } = useLocale();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);

  function close() {
    setOpen(false);
    if (changed) {
      setChanged(false);
      onDone(); // reload only now: the page behind may hide this button once the days fit
    }
  }

  return (
    <>
      <Button variant={variant} icon={CalendarClock} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {t("rebalanceButton")}
      </Button>
      <Dialog open={open} onClose={close} labelledBy={titleId} locked={busy}>
        {/* Mounted only while open, so the plan is worked out fresh each time. */}
        {open && (
          <RebalanceBody
            titleId={titleId}
            busy={busy}
            setBusy={setBusy}
            onApplied={() => setChanged(true)}
            onClose={close}
          />
        )}
      </Dialog>
    </>
  );
}

type BodyProps = {
  titleId: string;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onApplied: () => void;
  onClose: () => void;
};

function RebalanceBody({ titleId, busy, setBusy, onApplied, onClose }: BodyProps) {
  const { t, locale } = useLocale();
  const workspaceId = useWorkspace();
  const today = localDate(0);
  const fetcher = useCallback(() => rebalance(workspaceId, today, false), [workspaceId, today]);
  const { state, reload } = useLoad(fetcher);
  const [phase, setPhase] = useState<"plan" | "failed" | "done">("plan");

  async function apply() {
    setBusy(true);
    setPhase("plan");
    try {
      await rebalance(workspaceId, today, true);
      onApplied();
      setPhase("done");
    } catch {
      setPhase("failed"); // nothing was changed; the plan is still shown
    } finally {
      setBusy(false);
    }
  }

  const heading = (
    <h2 id={titleId} className="text-title font-bold">
      {t("rebalanceTitle")}
    </h2>
  );

  if (phase === "done") {
    return (
      <div className="space-y-4">
        {heading}
        <Notice tone="success" role="status">
          {t("rebalanceDone")}
        </Notice>
        <div className="text-right">
          <Button variant="primary" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        {heading}
        <div role="status" aria-busy="true" className="space-y-2">
          <span className="sr-only">{t("rebalanceLoading")}</span>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="space-y-4">
        {heading}
        <Notice tone="error">{t("rebalanceLoadError")}</Notice>
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => void reload()}>{t("tryAgain")}</Button>
          <Button onClick={onClose}>{t("close")}</Button>
        </div>
      </div>
    );
  }

  const plan = state.data;
  if (isEmptyPlan(plan)) {
    return (
      <div className="space-y-4">
        {heading}
        <p>{t("rebalanceNothing")}</p>
        <div className="text-right">
          <Button variant="primary" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {heading}
      <p className="text-sm text-text-secondary">
        {fill(t("rebalanceIntro"), { capacity: formatDuration(plan.capacity_minutes, t) })}
      </p>

      {plan.moves.length > 0 && (
        <section aria-labelledby={`${titleId}-moves`} className="space-y-2">
          <h3 id={`${titleId}-moves`} className="font-bold">
            {t("rebalanceMoves")}
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {plan.moves.map((move) => (
              <li key={move.task_id}>
                {fill(t("rebalanceMoveLine"), {
                  title: move.title,
                  date: formatDate(move.to_date, locale),
                })}
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.splits.length > 0 && (
        <section aria-labelledby={`${titleId}-splits`} className="space-y-3">
          <h3 id={`${titleId}-splits`} className="font-bold">
            {t("rebalanceSplits")}
          </h3>
          {plan.splits.map((split) => (
            <div key={split.task_id} className="text-sm">
              <p className="font-medium">
                {fill(t("rebalanceSplitLine"), {
                  title: split.title,
                  total: formatDuration(split.total_minutes, t),
                  count: split.parts.length,
                })}
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {split.parts.map((part) => (
                  <li key={part.title}>
                    {part.title} · {formatDate(part.date, locale)} ·{" "}
                    {formatDuration(part.minutes, t)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {phase === "failed" && <Notice tone="error">{t("rebalanceApplyError")}</Notice>}

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onClose} disabled={busy}>
          {t("cancel")}
        </Button>
        <Button variant="primary" onClick={() => void apply()} disabled={busy}>
          {busy ? t("rebalanceApplying") : t("rebalanceApply")}
        </Button>
      </div>
    </div>
  );
}
