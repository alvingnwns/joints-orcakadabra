"use client";

import { Info } from "lucide-react";
import { useState } from "react";

import { Illustration } from "@/components/illustrations/Illustration";
import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * "About this app", opened from the header on every page. The native <dialog> behind Dialog
 * gives a focus trap, Esc to close, and focus return. One factual privacy point only (C2).
 */
export function AboutDialog() {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button icon={Info} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {t("aboutButton")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="about-title">
        <Illustration name="welcome" width={180} className="mb-4" />
        <h2 id="about-title" className="text-section font-semibold">
          {t("aboutTitle")}
        </h2>
        <p className="mt-3">{t("aboutBody")}</p>
        <p className="mt-3 text-sm text-text-secondary">{t("aboutPrivacy")}</p>
        <div className="mt-5 text-right">
          <Button variant="primary" autoFocus onClick={() => setOpen(false)}>
            {t("close")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
