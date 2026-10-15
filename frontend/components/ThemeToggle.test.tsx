import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { LocaleProvider } from "@/components/LocaleProvider";
import { THEME_STORAGE_KEY } from "@/lib/theme";

import { ThemeToggle } from "./ThemeToggle";

const renderToggle = () =>
  render(
    <LocaleProvider>
      <ThemeToggle />
    </LocaleProvider>,
  );

const toggle = () => screen.getByRole("button", { name: "Dark mode" });

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("is one button named 'Dark mode', not pressed in the light theme", () => {
    renderToggle();

    expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(toggle().querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("switches the page to dark, remembers it, and switches back", async () => {
    renderToggle();

    await userEvent.click(toggle());

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(toggle()).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(toggle());

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
  });

  it("works from the keyboard", async () => {
    renderToggle();

    toggle().focus();
    await userEvent.keyboard("{Enter}");
    expect(document.documentElement.dataset.theme).toBe("dark");

    await userEvent.keyboard(" ");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("starts pressed when the page is already dark (set before first paint)", async () => {
    document.documentElement.dataset.theme = "dark";

    renderToggle();

    expect(await screen.findByRole("button", { name: "Dark mode", pressed: true })).toBeInTheDocument();
  });

  it("stays honest if something else changes the theme", async () => {
    renderToggle();

    await act(async () => {
      document.documentElement.dataset.theme = "dark";
      await Promise.resolve();
    });

    expect(await screen.findByRole("button", { name: "Dark mode", pressed: true })).toBeInTheDocument();
  });

  it("is called 'Mode gelap' in Indonesian", async () => {
    localStorage.setItem("orca.locale", "id");

    renderToggle();

    expect(await screen.findByRole("button", { name: "Mode gelap" })).toBeInTheDocument();
  });

  it("is a 44 px target", () => {
    renderToggle();

    expect(toggle()).toHaveClass("size-11");
  });
});
