import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import { LocaleProvider } from "@/components/LocaleProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Orca — a friendly task scheduler",
  description: "See what to do next. Postponing, simplifying, or skipping is always fine.",
};

// "cover" lets the page use the full screen on phones with notches, so the bottom navigation can
// pad itself with env(safe-area-inset-bottom) instead of sitting under the home indicator.
export const viewport: Viewport = { viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      {/* suppressHydrationWarning: this script sets data-theme before React starts. */}
      <body className="flex min-h-full flex-col">
        {/* A plain inline script runs before the first paint (next/script would run too late). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <LocaleProvider>
          <AppShell>{children}</AppShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
