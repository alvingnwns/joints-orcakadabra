import { ApiError, apiFetch } from "@/lib/api";

export const WORKSPACE_STORAGE_KEY = "orca.workspaceId";

type WorkspaceResponse = { id: string };

function readStoredId(): string | null {
  try {
    return localStorage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return null; // storage blocked: behave like a first visit
  }
}

function storeId(id: string) {
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
  } catch {
    // Not saved, so a new workspace is created next visit. Acceptable for an anonymous demo.
  }
}

async function ensureWorkspaceUncached(): Promise<string> {
  const stored = readStoredId();
  if (stored) {
    try {
      await apiFetch<WorkspaceResponse>(`/workspaces/${encodeURIComponent(stored)}`);
      return stored;
    } catch (error) {
      // Only a missing/invalid workspace means "start fresh". Server or network errors
      // are rethrown so we never replace a good workspace just because the server is down.
      const isStale = error instanceof ApiError && (error.status === 404 || error.status === 422);
      if (!isStale) throw error;
    }
  }

  const created = await apiFetch<WorkspaceResponse>("/workspaces", { method: "POST" });
  storeId(created.id);
  return created.id;
}

let pending: Promise<string> | null = null;

/** The workspace's own settings. (The server also returns the id and the creation time.) */
export type WorkspaceSettings = { daily_capacity_minutes: number };

export const CAPACITY_MIN = 30;
export const CAPACITY_MAX = 720;
export const CAPACITY_STEP = 15;
export const CAPACITY_DEFAULT = 240;

export const getWorkspaceSettings = (id: string) =>
  apiFetch<WorkspaceSettings>(`/workspaces/${encodeURIComponent(id)}`);

export const updateWorkspaceSettings = (id: string, changes: Partial<WorkspaceSettings>) =>
  apiFetch<WorkspaceSettings>(`/workspaces/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });

/**
 * Returns the id of this browser's workspace: reuses the saved one, or creates a new one on the
 * first visit or when the saved one no longer exists. Calls that overlap (React dev mode runs
 * effects twice) share one request, so only one workspace is created.
 */
export function ensureWorkspace(): Promise<string> {
  pending ??= ensureWorkspaceUncached().finally(() => {
    pending = null;
  });
  return pending;
}
