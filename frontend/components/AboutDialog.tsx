"use client";

import { useRef } from "react";

import { Illustration } from "@/components/illustrations/Illustration";
import { useT } from "@/components/LocaleProvider";

/**
 * "About this app", opened from the header on every page. The native <dialog> gives a focus
 * trap, Esc to close, and focus return for free. One factual privacy point only (C2).
 */
export function AboutDialog() {
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className="min-h-11 rounded-full border border-muted px-4 text-sm font-medium hover:bg-cream"
      >
        {t("aboutButton")}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="about-title"
        className="m-auto max-w-md rounded-card bg-surface p-6 text-ink shadow-lg backdrop:bg-ink/40"
      >
        <Illustration name="welcome" width={180} className="mb-4" />
        <h2 id="about-title" className="text-lg font-semibold">
          {t("aboutTitle")}
        </h2>
        <p className="mt-3">{t("aboutBody")}</p>
        <p className="mt-3 text-sm text-muted">{t("aboutPrivacy")}</p>
        <div className="mt-5 text-right">
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            className="min-h-11 rounded-full bg-ink px-5 font-medium text-cream"
          >
            {t("close")}
          </button>
        </div>
      </dialog>
    </>
  );
}
