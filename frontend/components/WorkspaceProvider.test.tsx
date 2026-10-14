import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceProvider, useWorkspace } from "@/components/WorkspaceProvider";

function ShowId() {
  return <p>workspace: {useWorkspace()}</p>;
}

describe("WorkspaceProvider", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("shows a loading state, then the app once the workspace is ready", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "abc" }), { status: 201 })),
    );

    render(
      <WorkspaceProvider>
        <ShowId />
      </WorkspaceProvider>,
    );

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(await screen.findByText("workspace: abc")).toBeInTheDocument();
  });

  it("shows a calm error with retry, and recovers", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce(new Response(JSON.stringify({ id: "abc" }), { status: 201 })),
    );

    render(
      <WorkspaceProvider>
        <ShowId />
      </WorkspaceProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByText("workspace: abc")).toBeInTheDocument();
  });
});
