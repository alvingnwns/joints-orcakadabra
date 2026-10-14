"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

type Status = "checking" | "ok" | "error";

/** Shows a gentle notice while the backend is unreachable. Renders nothing once it is up. */
export function ConnectionBanner() {
  const [status, setStatus] = useState<Status>("checking");

  const check = useCallback(async () => {
    setStatus("checking");
    try {
      await apiFetch<{ status: string }>("/health");
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // Async check on mount; state is only set after the request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
  }, [check]);

  return (
    <div role="status" aria-live="polite">
      {status === "checking" && (
        <p className="px-4 py-2 text-center text-sm text-muted">Connecting…</p>
      )}
      {status === "error" && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-peach px-4 py-3 text-sm">
          <p>We can&apos;t reach the server right now. Nothing is lost, so try again in a moment.</p>
          <button
            type="button"
            onClick={() => void check()}
            className="rounded-full border border-ink px-4 py-1.5 font-medium hover:bg-surface"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
