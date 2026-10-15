import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "./api";

const reply = (body: unknown, status: number) => new Response(JSON.stringify(body), { status });

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error("expected the request to fail");
}

describe("apiFetch errors", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the backend's error code on an http error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ detail: "ai_invalid_output" }, 502)));

    const error = await failure(apiFetch("/tasks/parse"));

    expect(error).toMatchObject({ kind: "http", status: 502, detail: "ai_invalid_output" });
  });

  it("has no detail when the body is not JSON, or the detail is a validation list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("oops", { status: 500 })));
    expect((await failure(apiFetch("/x"))).detail).toBeUndefined();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(reply({ detail: [{ msg: "bad" }] }, 422)));
    expect((await failure(apiFetch("/x"))).detail).toBeUndefined();
  });

  it("tells a lost connection apart from a server answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await failure(apiFetch("/x"));

    expect(error).toMatchObject({ kind: "network", status: undefined, detail: undefined });
  });

  it("returns nothing for a 204 and the body otherwise", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })));
    expect(await apiFetch("/x")).toBeUndefined();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(reply({ ok: true }, 200)));
    expect(await apiFetch("/x")).toEqual({ ok: true });
  });
});
