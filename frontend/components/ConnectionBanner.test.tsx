import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConnectionBanner } from "./ConnectionBanner";

function mockFetch(...results: Array<"ok" | "fail">) {
  const fn = vi.fn();
  for (const result of results) {
    if (result === "ok") {
      fn.mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
    } else {
      fn.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    }
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("ConnectionBanner", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows nothing once the server is reachable", async () => {
    mockFetch("ok");
    render(<ConnectionBanner />);

    expect(screen.getByText("Connecting…")).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.queryByText("Connecting…")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("shows a calm message with retry when the server is down, and recovers", async () => {
    const fetchMock = mockFetch("fail", "ok");
    render(<ConnectionBanner />);

    const retry = await screen.findByRole("button", { name: "Try again" });
    expect(screen.getByText(/can't reach the server/)).toBeInTheDocument();

    await userEvent.click(retry);

    await vi.waitFor(() =>
      expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
