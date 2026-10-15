"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { useT } from "@/components/LocaleProvider";
import { IconButton } from "@/components/ui/IconButton";
import { currentTheme, setTheme } from "@/lib/theme";

// The page's theme lives on <html data-theme>. Watching that attribute keeps the button honest
// even if something else changes it.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** A light/dark switch for the header. One name ("Dark mode") and a pressed state. */
export function ThemeToggle() {
  const t = useT();
  const dark = useSyncExternalStore(
    subscribe,
    () => currentTheme() === "dark",
    () => false, // the server cannot know; the real value is read right after load
  );

  return (
    <IconButton
      label={t("themeToggle")}
      icon={dark ? Sun : Moon}
      aria-pressed={dark}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="border border-border-strong bg-surface"
    />
  );
}
