"use client";

import type { ReactNode } from "react";

import { ConnectionBanner } from "@/components/ConnectionBanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useT } from "@/components/LocaleProvider";

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        {t("skipToMain")}
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-semibold">{t("appName")}</span>
            <span className="text-sm text-muted">{t("tagline")}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>
      <ConnectionBanner />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}
