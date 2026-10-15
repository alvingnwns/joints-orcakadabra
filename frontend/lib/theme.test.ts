import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY, currentTheme, setTheme } from "./theme";

/** Runs the same script the page runs in its <head> before first paint. */
const runInitScript = () => new Function(THEME_INIT_SCRIPT)();

function deviceIsDark(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: dark && query.includes("dark"), media: query })),
  );
}

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    deviceIsDark(false);
  });
  afterEach(() => vi.unstubAllGlobals());

  describe("the script that runs before the page is drawn", () => {
    it("follows the device when nothing was chosen yet", () => {
      deviceIsDark(true);
      runInitScript();
      expect(document.documentElement.dataset.theme).toBe("dark");

      deviceIsDark(false);
      runInitScript();
      expect(document.documentElement.dataset.theme).toBe("light");
    });

    it("prefers the saved choice over the device", () => {
      deviceIsDark(true);
      localStorage.setItem(THEME_STORAGE_KEY, "light");
      runInitScript();
      expect(document.documentElement.dataset.theme).toBe("light");

      deviceIsDark(false);
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      runInitScript();
      expect(document.documentElement.dataset.theme).toBe("dark");
    });

    it("ignores a saved value it does not know", () => {
      localStorage.setItem(THEME_STORAGE_KEY, "sepia");

      runInitScript();

      expect(document.documentElement.dataset.theme).toBe("light");
    });

    it("never throws, even when storage or matchMedia is unavailable", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });

      expect(() => runInitScript()).not.toThrow();
      vi.restoreAllMocks();
    });
  });

  describe("setTheme and currentTheme", () => {
    it("applies the theme to the page and remembers it", () => {
      setTheme("dark");

      expect(currentTheme()).toBe("dark");
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

      setTheme("light");
      expect(currentTheme()).toBe("light");
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    });

    it("reads as light when nothing is set", () => {
      expect(currentTheme()).toBe("light");
    });

    it("still applies for this visit if the choice cannot be saved", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });

      expect(() => setTheme("dark")).not.toThrow();
      expect(currentTheme()).toBe("dark");
      vi.restoreAllMocks();
    });
  });
});
