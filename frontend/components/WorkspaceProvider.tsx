"use client";

import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";

import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { ensureWorkspace } from "@/lib/workspace";

type Status = "loading" | "error" | "ready";

type WorkspaceValue = {
  status: Status;
  id: string | null;
  reload: () => void;
  settingsVersion: number;
  settingsChanged: () => void;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

function useWorkspaceValue(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside a WorkspaceProvider");
  return value;
}

/** The current workspace id. Only usable once the workspace is ready (below WorkspaceGate). */
export function useWorkspace(): string {
  const { id } = useWorkspaceValue();
  if (!id) throw new Error("useWorkspace must be used inside a ready WorkspaceProvider");
  return id;
}

/** Like useWorkspace, but null while there is no workspace yet, instead of throwing. */
export function useOptionalWorkspace(): string | null {
  return useContext(WorkspaceContext)?.id ?? null;
}

/**
 * Goes up by one each time the person saves their settings. A page that depends on a setting
 * (like the daily capacity) lists it in its fetcher's dependencies, so it loads again.
 */
export function useSettingsVersion(): number {
  return useWorkspaceValue().settingsVersion;
}

/** Call after saving settings, so pages that depend on them refresh. */
export function useSettingsChanged(): () => void {
  return useWorkspaceValue().settingsChanged;
}

/** Finds or creates this browser's workspace, and shares it. Renders its children right away. */
export function WorkspaceState({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: Status; id: string | null }>({
    status: "loading",
    id: null,
  });
  const [settingsVersion, setSettingsVersion] = useState(0);
  const settingsChanged = useCallback(() => setSettingsVersion((version) => version + 1), []);

  const load = useCallback(async () => {
    setState({ status: "loading", id: null });
    try {
      setState({ status: "ready", id: await ensureWorkspace() });
    } catch {
      setState({ status: "error", id: null });
    }
  }, []);

  useEffect(() => {
    // Async load on mount; state is only set after the request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <WorkspaceContext.Provider
      value={{ ...state, reload: () => void load(), settingsVersion, settingsChanged }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

/** Shows the children once the workspace is ready, and a calm loading or error state before. */
export function WorkspaceGate({ children }: { children: ReactNode }) {
  const t = useT();
  const { status, reload } = useWorkspaceValue();

  if (status === "ready") return <>{children}</>;

  if (status === "error") {
    return (
      <Notice tone="error" action={<Button onClick={reload}>{t("tryAgain")}</Button>}>
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

/** The usual way in: the workspace plus the gate, so children can rely on a ready workspace. */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  return (
    <WorkspaceState>
      <WorkspaceGate>{children}</WorkspaceGate>
    </WorkspaceState>
  );
}
