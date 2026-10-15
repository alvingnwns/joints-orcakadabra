"use client";

import Link from "next/link";

import { useT } from "@/components/LocaleProvider";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  const t = useT();
  return (
    <EmptyState
      className="mx-auto max-w-xl"
      tone="neutral"
      illustration="oops"
      illustrationWidth={200}
      title={t("notFoundTitle")}
      titleAs="h1"
      action={
        <Link href="/" className={buttonClasses("primary")}>
          {t("draftsSeeToday")}
        </Link>
      }
    />
  );
}
