import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LocaleProvider, useT } from "@/components/LocaleProvider";
import { LOCALE_STORAGE_KEY } from "@/lib/i18n";

function Greeting() {
  const t = useT();
  return <p>{t("welcomeTitle")}</p>;
}

function renderApp() {
  return render(
    <LocaleProvider>
      <LanguageSwitcher />
      <Greeting />
    </LocaleProvider>,
  );
}

describe("language switching", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("switches all text, updates <html lang>, and remembers the choice", async () => {
    renderApp();
    expect(screen.getByText("Welcome")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Language"), "id");

    expect(screen.getByText("Selamat datang")).toBeInTheDocument();
    expect(screen.getByLabelText("Bahasa")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("id");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("id");
  });

  it("restores the saved language on the next visit", async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "id");

    renderApp();

    expect(await screen.findByText("Selamat datang")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("id");
  });

  it("starts in Indonesian when the browser language is Indonesian", async () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("id-ID");

    renderApp();

    expect(await screen.findByText("Selamat datang")).toBeInTheDocument();
  });

  it("ignores an invalid saved value", async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "klingon");

    renderApp();

    expect(screen.getByText("Welcome")).toBeInTheDocument();
  });
});
