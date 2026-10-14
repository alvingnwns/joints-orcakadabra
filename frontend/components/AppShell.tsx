import type { ReactNode } from "react";

import { ConnectionBanner } from "@/components/ConnectionBanner";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to main content
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-baseline gap-3 px-4 py-4">
          <span className="text-xl font-semibold">Orca</span>
          <span className="text-sm text-muted">One small step at a time</span>
        </div>
      </header>
      <ConnectionBanner />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}
