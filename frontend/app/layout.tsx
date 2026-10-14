import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Orca — a friendly task scheduler",
  description: "See what to do next. Postponing, simplifying, or skipping is always fine.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
