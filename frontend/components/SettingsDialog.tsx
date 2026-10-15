"use client";

import { Settings } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLoad } from "@/components/useLoad";
import { useOptionalWorkspace, useSettingsChanged, useWorkspace } from "@/components/WorkspaceProvider";
import { fill } from "@/lib/i18n";
import { formatDuration } from "@/lib/load";
import {
  CAPACITY_MAX,
  CAPACITY_MIN,
  CAPACITY_STEP,
  getWorkspaceSettings,
  updateWorkspaceSettings,
} from "@/lib/workspace";

const PRESETS = [120, 240, 360, 480];

/**
 * Everything the person can adjust, in one place: language, how much work fits in a day, and a
 * short "about" with the privacy note. Opened from the header on every page.
 */
export function SettingsDialog() {
  const t = useT();
  const titleId = useId();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button icon={Settings} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {t("settingsButton")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy={titleId}>
        {/* Mounted only while open, so the settings are fetched fresh each time. */}
        {open && <SettingsBody titleId={titleId} onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

function SettingsBody({ titleId, onClose }: { titleId: string; onClose: () => void }) {
  const t = useT();

  return (
    <div className="space-y-6">
      <h2 id={titleId} className="flex items-center gap-2 text-title font-bold">
        <Icon icon={Settings} size={22} className="text-primary" />
        {t("settingsTitle")}
      </h2>

      <LanguageSwitcher />

      <section aria-labelledby={`${titleId}-cap`} className="border-t border-border pt-5">
        <h3 id={`${titleId}-cap`} className="text-base font-bold">
          {t("settingsCapacityTitle")}
        </h3>
        <p className="mt-1 text-sm text-text-secondary">{t("settingsCapacityHint")}</p>
        <CapacityPicker />
      </section>

      <section aria-labelledby={`${titleId}-about`} className="border-t border-border pt-5">
        <h3 id={`${titleId}-about`} className="text-base font-bold">
          {t("aboutTitle")}
        </h3>
        <p className="mt-1 text-sm">{t("aboutBody")}</p>
        <p className="mt-2 text-sm text-text-secondary">{t("aboutPrivacy")}</p>
      </section>

      <div className="text-right">
        <Button variant="primary" onClick={onClose}>
          {t("close")}
        </Button>
      </div>
    </div>
  );
}

function CapacityPicker() {
  const t = useT();
  const workspaceId = useOptionalWorkspace();

  // Opened before the workspace is ready (e.g. a slow start): wait, don't fail.
  if (!workspaceId) {
    return (
      <div role="status" aria-busy="true" className="mt-4">
        <span className="sr-only">{t("workspaceLoading")}</span>
        <Skeleton className="h-16" />
      </div>
    );
  }
  return <LoadedCapacity workspaceId={workspaceId} />;
}

function LoadedCapacity({ workspaceId }: { workspaceId: string }) {
  const t = useT();
  const fetcher = useCallback(() => getWorkspaceSettings(workspaceId), [workspaceId]);
  const { state, reload } = useLoad(fetcher);

  if (state.status === "loading") {
    return (
      <div role="status" aria-busy="true" className="mt-4">
        <span className="sr-only">{t("tasksLoading")}</span>
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <Notice
        tone="error"
        className="mt-4"
        action={<Button onClick={() => void reload()}>{t("tryAgain")}</Button>}
      >
        {t("settingsLoadError")}
      </Notice>
    );
  }
  return <CapacityForm saved={state.data.daily_capacity_minutes} />;
}

function CapacityForm({ saved }: { saved: number }) {
  const t = useT();
  const sliderId = useId();
  const workspaceId = useWorkspace();
  const settingsChanged = useSettingsChanged();
  const [current, setCurrent] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"saved" | "failed" | null>(null);

  async function save() {
    setSaving(true);
    setResult(null);
    try {
      const updated = await updateWorkspaceSettings(workspaceId, {
        daily_capacity_minutes: current,
      });
      setLastSaved(updated.daily_capacity_minutes);
      setResult("saved");
      settingsChanged(); // Today and Week load again with the new number
    } catch {
      setResult("failed"); // the slider stays where the person put it
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={sliderId} className="text-sm font-medium">
            {t("settingsCapacityLabel")}
          </label>
          <output htmlFor={sliderId} className="text-title font-bold text-primary">
            {formatDuration(current, t)}
          </output>
        </div>
        <input
          id={sliderId}
          type="range"
          min={CAPACITY_MIN}
          max={CAPACITY_MAX}
          step={CAPACITY_STEP}
          value={current}
          aria-valuetext={formatDuration(current, t)}
          onChange={(event) => {
            setCurrent(Number(event.target.value));
            setResult(null);
          }}
          className="mt-2 h-8 w-full cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-meta text-text-secondary" aria-hidden="true">
          <span>{formatDuration(CAPACITY_MIN, t)}</span>
          <span>{formatDuration(CAPACITY_MAX, t)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((minutes) => (
          <Button
            key={minutes}
            variant={current === minutes ? "primary" : "secondary"}
            aria-pressed={current === minutes}
            onClick={() => {
              setCurrent(minutes);
              setResult(null);
            }}
          >
            {formatDuration(minutes, t)}
          </Button>
        ))}
      </div>

      {result === "saved" && (
        <Notice tone="success" role="status">
          {fill(t("settingsSaved"), { value: formatDuration(lastSaved, t) })}
        </Notice>
      )}
      {result === "failed" && <Notice tone="error">{t("settingsSaveError")}</Notice>}

      <Button
        variant="primary"
        onClick={() => void save()}
        disabled={saving || current === lastSaved}
      >
        {saving ? t("saving") : t("save")}
      </Button>
    </div>
  );
}
