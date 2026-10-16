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

  // Opened from a "use on another device" link on a browser with no workspace yet: take it.
  // (A browser that already has one asks first, see SharedLinkPrompt.)
  const linked = stored ? null : readLinkCode();
  if (linked) {
    try {
      const id = await adoptWorkspace(linked);
      clearLinkCode();
      return id;
    } catch (error) {
      const isStale = error instanceof ApiError && (error.status === 404 || error.status === 422);
      if (!isStale) throw error; // server down: keep the link so a retry still works
      clearLinkCode(); // a link to nothing: carry on with a new workspace
    }
  }

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

// --- sharing a workspace with another device ---

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const LINK_PARAM = "workspace";

/**
 * Pulls a workspace code out of whatever the person pasted: the bare code, a full link, or a
 * sentence around either. Returns null when there is no code in it.
 */
export function parseWorkspaceCode(input: string): string | null {
  return UUID.exec(input)?.[0].toLowerCase() ?? null;
}

/**
 * A link that opens this workspace on another device. The code sits after the "#", which the
 * browser never sends to any server, so it does not end up in server logs.
 */
export function workspaceLink(id: string, origin: string): string {
  return `${origin}/#${LINK_PARAM}=${id}`;
}

/** The code from an opened link (`/#workspace=<code>`), or null when the page has none. */
export function readLinkCode(): string | null {
  const value = new URLSearchParams(window.location.hash.slice(1)).get(LINK_PARAM);
  return value ? parseWorkspaceCode(value) : null;
}

/** Removes the code from the address bar, so a reload or a bookmark does not repeat it. */
export function clearLinkCode() {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", pathname + search);
}

/**
 * Makes `code` this browser's workspace, after checking that it exists. Throws an ApiError
 * (status 404 or 422 when there is no such workspace) and changes nothing if it does not.
 */
export async function adoptWorkspace(code: string): Promise<string> {
  const id = parseWorkspaceCode(code);
  if (!id) throw new ApiError("http", "Not a workspace code.", 422);
  await apiFetch<WorkspaceResponse>(`/workspaces/${encodeURIComponent(id)}`);
  storeId(id);
  return id;
}

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
