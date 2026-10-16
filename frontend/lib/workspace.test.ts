import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  WORKSPACE_STORAGE_KEY,
  adoptWorkspace,
  clearLinkCode,
  ensureWorkspace,
  parseWorkspaceCode,
  readLinkCode,
  readRecentWorkspaces,
  workspaceLink,
} from "./workspace";

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

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("workspace codes and links", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => vi.unstubAllGlobals());

  describe("parseWorkspaceCode", () => {
    it("accepts a bare code, in any letter case", () => {
      expect(parseWorkspaceCode(A)).toBe(A);
      expect(parseWorkspaceCode("AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE")).toBe(
        "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      );
    });

    it("finds the code inside a link or a sentence, ignoring spaces around it", () => {
      expect(parseWorkspaceCode(`  https://pikoplan.vercel.app/#workspace=${A}  `)).toBe(A);
      expect(parseWorkspaceCode(`my code is ${A}, thanks`)).toBe(A);
    });

    it.each(["", "   ", "hello", "1234", "11111111-1111-4111-8111", `${A.slice(0, -1)}`])(
      "rejects %j",
      (input) => {
        expect(parseWorkspaceCode(input)).toBeNull();
      },
    );
  });

  it("builds a link whose code sits after the # (never sent to a server)", () => {
    const link = workspaceLink(A, "https://pikoplan.vercel.app");

    expect(link).toBe(`https://pikoplan.vercel.app/#workspace=${A}`);
    expect(new URL(link).search).toBe("");
    expect(parseWorkspaceCode(link)).toBe(A);
  });

  it("reads the code from the address bar and can clear it again", () => {
    expect(readLinkCode()).toBeNull();

    window.history.replaceState(null, "", `/week?x=1#workspace=${A}`);
    expect(readLinkCode()).toBe(A);

    clearLinkCode();
    expect(readLinkCode()).toBeNull();
    expect(window.location.pathname + window.location.search).toBe("/week?x=1"); // rest is kept
  });

  it("ignores a link parameter that holds no valid code", () => {
    window.history.replaceState(null, "", "/#workspace=not-a-code");

    expect(readLinkCode()).toBeNull();
  });

  describe("adoptWorkspace", () => {
    it("saves the code once the server confirms the workspace exists", async () => {
      fakeBackend([A]);

      expect(await adoptWorkspace(`link: /#workspace=${A}`)).toBe(A);

      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(A);
    });

    it("remembers the workspace it leaves, so the person can switch back", async () => {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, B);
      fakeBackend([A, B]);

      await adoptWorkspace(A);
      expect(readRecentWorkspaces()).toEqual([B]);

      await adoptWorkspace(B);
      expect(readRecentWorkspaces()).toEqual([A, B]); // the Settings list hides the current one
    });

    it("changes nothing when there is no such workspace", async () => {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, B);
      fakeBackend([B]);

      await expect(adoptWorkspace(A)).rejects.toMatchObject({ status: 404 });

      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(B);
    });

    it("changes nothing for text that is not a code, and does not even ask the server", async () => {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, B);
      const fetchMock = fakeBackend([B]);

      await expect(adoptWorkspace("nonsense")).rejects.toMatchObject({ status: 422 });

      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(B);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("changes nothing when the server cannot be reached", async () => {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, B);
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

      await expect(adoptWorkspace(A)).rejects.toThrow();

      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(B);
    });
  });

  describe("opening a link when the page loads", () => {
    it("a browser with no workspace takes the linked one, and the address bar is tidied", async () => {
      window.history.replaceState(null, "", `/#workspace=${A}`);
      const fetchMock = fakeBackend([A]);

      expect(await ensureWorkspace()).toBe(A);

      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(A);
      expect(window.location.hash).toBe("");
      expect(posts(fetchMock)).toBe(0); // no extra empty workspace was created
    });

    it("a link to a workspace that does not exist falls back to a new workspace", async () => {
      window.history.replaceState(null, "", `/#workspace=${A}`);
      const fetchMock = fakeBackend([]);

      expect(await ensureWorkspace()).toBe("new-id");

      expect(window.location.hash).toBe("");
      expect(posts(fetchMock)).toBe(1);
    });

    it("never replaces an existing workspace by itself (the person is asked instead)", async () => {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, B);
      window.history.replaceState(null, "", `/#workspace=${A}`);
      fakeBackend([A, B]);

      expect(await ensureWorkspace()).toBe(B);

      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(B);
      expect(readLinkCode()).toBe(A); // still there for the prompt to read
    });

    it("keeps the link when the server is down, so trying again still works", async () => {
      window.history.replaceState(null, "", `/#workspace=${A}`);
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

      await expect(ensureWorkspace()).rejects.toThrow();

      expect(readLinkCode()).toBe(A);
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();
    });
  });
});
