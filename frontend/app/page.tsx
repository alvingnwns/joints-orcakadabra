"use client";

import { useT } from "@/components/LocaleProvider";

export default function Home() {
  const t = useT();

  return (
    <section className="rounded-card bg-surface p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{t("welcomeTitle")}</h1>
      <p className="mt-2 text-muted">{t("welcomeBody")}</p>
    </section>
  );
}
