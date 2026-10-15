export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "orca.theme";

/**
 * Runs in the page <head> before anything is drawn, so a returning visitor never sees a flash
 * of the wrong theme. It uses the saved choice, or else the device's own light/dark setting.
 * (The page's `data-theme` attribute is what the dark colors in globals.css hang on.)
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})();`;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Applies a theme now and remembers it for next time. */
export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not being able to save the choice is fine; it still applies for this visit.
  }
}
