"use client";

import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";

import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { ensureWorkspace } from "@/lib/workspace";

const WorkspaceContext = createContext<string | null>(null);

/** The current workspace id. Only usable below WorkspaceProvider, which renders children once ready. */
export function useWorkspace(): string {
  const id = useContext(WorkspaceContext);
  if (!id) throw new Error("useWorkspace must be used inside a ready WorkspaceProvider");
  return id;
}

type State = { status: "loading" } | { status: "error" } | { status: "ready"; id: string };

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", id: await ensureWorkspace() });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    // Async load on mount; state is only set after the request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (state.status === "ready") {
    return <WorkspaceContext.Provider value={state.id}>{children}</WorkspaceContext.Provider>;
  }

  if (state.status === "error") {
    return (
      <Notice
        tone="error"
        action={<Button onClick={() => void load()}>{t("tryAgain")}</Button>}
      >
        {t("workspaceError")}
      </Notice>
    );
  }

  return (
    <Card role="status" aria-busy="true" padding="lg">
      <span className="sr-only">{t("workspaceLoading")}</span>
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Card>
  );
}
