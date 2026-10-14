"use client";

import { useCallback, useEffect, useState } from "react";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: T };

/**
 * Loads data on mount. `reload` shows the loading state again (used by "Try again");
 * `refresh` keeps the current data on screen while fetching (used after an action).
 */
export function useLoad<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      setState({ status: "ready", data: await fetcher() });
    } catch {
      setState({ status: "error" });
    }
  }, [fetcher]);

  const reload = useCallback(async () => {
    setState({ status: "loading" });
    await refresh();
  }, [refresh]);

  useEffect(() => {
    // Async load on mount; state is only set after the request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { state, reload, refresh };
}
