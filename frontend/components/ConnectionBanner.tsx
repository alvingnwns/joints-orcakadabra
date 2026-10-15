"use client";

import { useCallback, useEffect, useState } from "react";

import { Illustration } from "@/components/illustrations/Illustration";
import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";

type Status = "checking" | "ok" | "error";

/** Shows a gentle notice while the backend is unreachable. Renders nothing once it is up. */
export function ConnectionBanner() {
  const t = useT();
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
        <p className="px-4 py-2 text-center text-sm text-text-secondary">{t("connecting")}</p>
      )}
      {status === "error" && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-attention px-4 py-3 text-sm text-attention-text">
          <Illustration name="connection-error" width={72} className="mx-0" />
          <p>{t("serverUnreachable")}</p>
          <Button onClick={() => void check()}>{t("tryAgain")}</Button>
        </div>
      )}
    </div>
  );
}
