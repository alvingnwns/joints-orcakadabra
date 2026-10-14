import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WORKSPACE_STORAGE_KEY, ensureWorkspace } from "./workspace";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** Fake backend: `known` is the set of workspace ids that exist. */
function fakeBackend(known: string[]) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return json({ id: "new-id" }, 201);
    const id = url.split("/workspaces/")[1];
    return known.includes(id) ? json({ id }) : json({ detail: "Workspace not found" }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const posts = (fetchMock: ReturnType<typeof fakeBackend>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === "POST").length;

describe("ensureWorkspace", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("creates and saves a workspace on the first visit", async () => {
    const fetchMock = fakeBackend([]);

    expect(await ensureWorkspace()).toBe("new-id");

    expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe("new-id");
    expect(posts(fetchMock)).toBe(1);
  });

  it("reuses the saved workspace on later visits", async () => {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, "saved-id");
    const fetchMock = fakeBackend(["saved-id"]);

    expect(await ensureWorkspace()).toBe("saved-id");

    expect(posts(fetchMock)).toBe(0);
  });

  it("creates a new workspace when the saved one no longer exists", async () => {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, "gone-id");
    const fetchMock = fakeBackend([]);

    expect(await ensureWorkspace()).toBe("new-id");

    expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe("new-id");
    expect(posts(fetchMock)).toBe(1);
  });

  it("keeps the saved workspace when the server is unreachable", async () => {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, "saved-id");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(ensureWorkspace()).rejects.toThrow();

    expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe("saved-id");
  });

  it("creates only one workspace when called twice at the same time", async () => {
    const fetchMock = fakeBackend([]);

    const [a, b] = await Promise.all([ensureWorkspace(), ensureWorkspace()]);

    expect(a).toBe(b);
    expect(posts(fetchMock)).toBe(1);
  });
});
