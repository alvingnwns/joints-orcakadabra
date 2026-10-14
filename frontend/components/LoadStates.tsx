"use client";

import { useT } from "@/components/LocaleProvider";

/** Skeleton with a screen-reader label, shared by the Today and Week views. */
export function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
        <div className="h-16 rounded-card bg-line" />
        <div className="h-16 rounded-card bg-line" />
      </div>
    </div>
  );
}

/** Calm error with a retry button. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="rounded-card bg-peach p-4">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 min-h-11 rounded-full border border-ink px-4 font-medium hover:bg-surface"
      >
        {t("tryAgain")}
      </button>
    </div>
  );
}
