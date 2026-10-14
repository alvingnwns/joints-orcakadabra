"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AboutDialog } from "@/components/AboutDialog";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useT } from "@/components/LocaleProvider";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import type { TranslationKey } from "@/lib/i18n/en";

const NAV: { href: string; label: TranslationKey }[] = [
  { href: "/", label: "todayTitle" },
  { href: "/week", label: "navWeek" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const pathname = usePathname();

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
          <div className="flex items-center gap-2">
            <AboutDialog />
            <LanguageSwitcher />
          </div>
        </div>
        <nav aria-label={t("navLabel")} className="mx-auto max-w-3xl px-4 pb-3">
          <ul className="flex gap-2">
            {NAV.map((item) => {
              const current = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`flex min-h-11 items-center rounded-full px-4 font-medium ${
                      current ? "bg-ink text-cream" : "hover:bg-cream"
                    }`}
                  >
                    {t(item.label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <ConnectionBanner />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </main>
    </>
  );
}
