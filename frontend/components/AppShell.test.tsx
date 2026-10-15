import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/components/LocaleProvider";

import { AppShell } from "./AppShell";

let mockPath = "/";
vi.mock("next/navigation", () => ({ usePathname: () => mockPath }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function renderShell() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const { pathname } = new URL(url);
      if (pathname === "/health") return json({ status: "ok" });
      if (pathname === "/workspaces") return json({ id: "ws1" }, 201);
      if (pathname === "/workspaces/ws1") return json({ id: "ws1", daily_capacity_minutes: 240 });
      return json({});
    }),
  );
  return render(
    <LocaleProvider>
      <AppShell>
        <p>Page content</p>
      </AppShell>
    </LocaleProvider>,
  );
}

describe("AppShell navigation", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPath = "/";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("has one main navigation with the four destinations, in order", () => {
    renderShell();

    const nav = screen.getByRole("navigation", { name: "Main" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Today",
      "Week",
      "All tasks",
      "Brain dump",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/week",
      "/tasks",
      "/dump",
    ]);
  });

  it.each([
    ["/", "Today"],
    ["/week", "Week"],
    ["/tasks", "All tasks"],
    ["/dump", "Brain dump"],
  ])("marks only the current page (%s)", (path, name) => {
    mockPath = path;
    renderShell();

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    expect(nav.querySelectorAll("[aria-current]")).toHaveLength(1);
  });

  it("renames the destinations when the language changes in Settings", async () => {
    renderShell();

    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    await userEvent.selectOptions(screen.getByLabelText("Language"), "id");

    const nav = screen.getByRole("navigation", { name: "Utama" });
    expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Hari ini",
      "Minggu ini",
      "Semua tugas",
      "Curah pikiran",
    ]);
  });

  it("keeps the skip link, one Settings button and the chat entry point in the shell", async () => {
    renderShell();

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main",
    );
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    // Language and About are no longer separate controls in the header.
    expect(screen.queryByRole("button", { name: "About" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Ask about my schedule" })).toBeInTheDocument();
    expect(await screen.findByText("Page content")).toBeInTheDocument();
  });
});
