"use client";

import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";

import { useT } from "@/components/LocaleProvider";
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
      <div role="alert" className="rounded-card bg-peach p-6">
        <p>{t("workspaceError")}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 min-h-11 rounded-full border border-ink px-4 font-medium hover:bg-surface"
        >
          {t("tryAgain")}
        </button>
      </div>
    );
  }

  return (
    <div role="status" aria-busy="true" className="rounded-card bg-surface p-6 shadow-sm">
      <span className="sr-only">{t("workspaceLoading")}</span>
      <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
        <div className="h-6 w-1/3 rounded bg-line" />
        <div className="h-4 w-2/3 rounded bg-line" />
      </div>
    </div>
  );
}
