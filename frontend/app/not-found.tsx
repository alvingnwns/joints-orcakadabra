"use client";

import Link from "next/link";

import { Illustration } from "@/components/illustrations/Illustration";
import { useT } from "@/components/LocaleProvider";

export default function NotFound() {
  const t = useT();
  return (
    <div className="rounded-card bg-surface p-6 text-center shadow-sm">
      <Illustration name="oops" width={200} className="mb-4" />
      <h1 className="text-xl font-semibold">{t("notFoundTitle")}</h1>
      <Link
        href="/"
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 font-medium text-cream"
      >
        {t("draftsSeeToday")}
      </Link>
    </div>
  );
}
