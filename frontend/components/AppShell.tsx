"use client";

import { CalendarCheck, CalendarDays, ListChecks, NotebookPen, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { useT } from "@/components/LocaleProvider";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon } from "@/components/ui/Icon";
import { WorkspaceGate, WorkspaceState } from "@/components/WorkspaceProvider";
import { SharedLinkPrompt } from "@/components/WorkspaceSharing";
import type { TranslationKey } from "@/lib/i18n/en";

const NAV: { href: string; label: TranslationKey; icon: LucideIcon }[] = [
  { href: "/", label: "todayTitle", icon: CalendarCheck },
  { href: "/week", label: "navWeek", icon: CalendarDays },
  { href: "/tasks", label: "navTasks", icon: ListChecks },
  { href: "/dump", label: "navDump", icon: NotebookPen },
];

/**
 * One <nav> for every screen size: inline in the header from the lg breakpoint up, and a
 * fixed bar at the bottom of the screen below it (thumb reach), padded for the home indicator.
 * Everything the person can adjust (language, daily time, about) sits behind one Settings button.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const pathname = usePathname();

  return (
    // The workspace is shared with the header (Settings needs it), while only the page itself
    // waits behind the gate.
    <WorkspaceState>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2"
      >
        {t("skipToMain")}
      </a>
      {/* No blur or transform on the header: they would make the fixed bottom nav (which lives
          inside it) stick to the header instead of the bottom of the screen. */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-x-6 px-4 py-3 md:px-8">
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-extrabold tracking-tight text-primary">{t("appName")}</span>
            <span className="hidden text-sm text-text-secondary xl:inline">{t("tagline")}</span>
          </div>

          <nav
            aria-label={t("navLabel")}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgb(38_51_45/0.25)] lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:pb-0 lg:shadow-none"
          >
            <ul className="mx-auto flex max-w-xl lg:max-w-none lg:gap-1">
              {NAV.map((item) => {
                const current = pathname === item.href;
                return (
                  <li key={item.href} className="min-w-0 flex-1 lg:flex-none">
                    <Link
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      className={`m-1 flex min-h-14 flex-col items-center justify-center gap-1 rounded-control px-1 text-meta lg:m-0 lg:min-h-11 lg:flex-row lg:gap-2 lg:px-4 lg:text-base ${
                        current
                          ? "bg-primary-soft font-bold text-primary"
                          : "font-medium text-text hover:bg-surface-muted"
                      }`}
                    >
                      <Icon icon={item.icon} />
                      {t(item.label)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <SettingsDialog />
          </div>
        </div>
      </header>
      <ConnectionBanner />
      <SharedLinkPrompt />
      {/* The bottom padding keeps content clear of the mobile nav and the chat button. */}
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-[calc(10rem+env(safe-area-inset-bottom))] md:px-8 md:pt-8 lg:pb-24"
      >
        <WorkspaceGate>
          <ChatPanel>{children}</ChatPanel>
        </WorkspaceGate>
      </main>
    </WorkspaceState>
  );
}
