"use client";

import { WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { apiFetch } from "@/lib/api";

type Status = "checking" | "ok" | "error";

/**
 * Tells the person, calmly, when the server can't be reached and that changes aren't being
 * saved. Renders nothing while all is well. It checks on load, when the tab is focused again,
 * and when the browser reports it is back online, so it clears itself without a reload.
 */
export function ConnectionBanner() {
  const t = useT();
  const [status, setStatus] = useState<Status>("checking");
  const [retrying, setRetrying] = useState(false);

  const check = useCallback(async () => {
    try {
      await apiFetch<{ status: string }>("/health");
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  async function retry() {
    setRetrying(true);
    await check();
    setRetrying(false);
  }

  useEffect(() => {
    // Async check on mount; state is only set after the request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
  }, [check]);

  useEffect(() => {
    const recheck = () => void check();
    window.addEventListener("focus", recheck);
    window.addEventListener("online", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      window.removeEventListener("online", recheck);
    };
  }, [check]);

  return (
    <div role="status" aria-live="polite" className="sticky top-0 z-30">
      {status === "checking" && (
        <p className="px-4 py-2 text-center text-sm text-text-secondary">{t("connecting")}</p>
      )}
      {status === "error" && (
        <div className="border-b border-attention-text/20 bg-attention text-attention-text">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 md:px-8">
            <Icon icon={WifiOff} size={20} />
            <p className="min-w-48 flex-1 text-sm font-medium">{t("serverUnreachable")}</p>
            <Button onClick={() => void retry()} disabled={retrying}>
              {t("tryAgain")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
