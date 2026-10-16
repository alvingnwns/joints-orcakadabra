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

  it("makes Brain dump the one filled button, last in the nav, and keeps the others plain", () => {
    renderShell();

    const nav = screen.getByRole("navigation", { name: "Main" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Today",
      "Week",
      "All tasks",
      "Brain dump",
    ]);

    const [today, week, tasks, dump] = links;
    expect(dump.className).toContain("bg-primary");
    expect(dump.className).toContain("text-on-primary");
    expect(dump.closest("li")!.className).toContain("lg:ml-auto"); // set apart on wide screens
    for (const plain of [today, week, tasks]) {
      expect(plain.className).not.toContain("bg-primary ");
      expect(plain.className).not.toContain("text-on-primary");
    }
  });

  it("still marks Brain dump as the current page when you are on it", () => {
    mockPath = "/dump";

    renderShell();

    const dump = within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", {
      name: "Brain dump",
    });
    expect(dump).toHaveAttribute("aria-current", "page");
    expect(dump.className).toContain("ring-2"); // a visible 'you are here' on the filled button
  });

  it("is called PikoPlan, with the tagline 'Your day, your way'", () => {
    renderShell();

    const header = screen.getByRole("banner");
    expect(within(header).getByText("PikoPlan")).toBeInTheDocument();
    expect(within(header).getByText("Your day, your way")).toBeInTheDocument();
    expect(header).not.toHaveTextContent(/orca/i);
  });

  it("has the tagline in Indonesian too", () => {
    localStorage.setItem("orca.locale", "id");

    renderShell();

    return screen.findByText("Harimu, caramu");
  });

  it("puts the Dark mode button right next to Settings, in the header", () => {
    renderShell();

    const header = screen.getByRole("banner");
    const toggle = within(header).getByRole("button", { name: "Dark mode" });
    const settings = within(header).getByRole("button", { name: "Settings" });

    expect(toggle.nextElementSibling).toBe(settings);
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
