"use client";

import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

/** Skeleton with a screen-reader label, shared by the Today and Week views. */
export function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </div>
  );
}

/** Calm error with a retry button. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useT();
  return (
    <EmptyState
      role="alert"
      tone="error"
      illustration="oops"
      illustrationWidth={140}
      text={message}
      action={<Button onClick={onRetry}>{t("tryAgain")}</Button>}
    />
  );
}
