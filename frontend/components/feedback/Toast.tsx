"use client";

import { X } from "lucide-react";

import { Illustration } from "@/components/illustrations/Illustration";
import { useT } from "@/components/LocaleProvider";
import { Icon } from "@/components/ui/Icon";
import type { TranslationKey } from "@/lib/i18n/en";

export type ToastMessage = {
  message: TranslationKey;
  /** A finished task: shows the small check burst. */
  celebrate?: boolean;
  /** Present when the action can be undone. */
  undo?: () => Promise<unknown>;
};

type Props = { toast: ToastMessage | null; onUndo: () => void; onDismiss: () => void };

// The toast is a dark surface, so its controls use light outlines and a light focus ring.
const toastButton =
  "min-h-11 rounded-control text-sm font-medium hover:bg-on-primary hover:text-text focus-visible:outline-on-primary";

/**
 * A small toast at the bottom of the screen. It stays until the next action or until it is
 * dismissed, so there is no time pressure to reach "Undo" (WCAG 2.2.1). The live region is
 * always rendered so screen readers announce each new message.
 */
export function Toast({ toast, onUndo, onDismiss }: Props) {
  const t = useT();

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-40 md:bottom-4 md:left-8 md:right-auto md:max-w-sm"
    >
      {toast && (
        <div className="flex items-center gap-3 rounded-card bg-text p-3 text-on-primary shadow-lg motion-safe:animate-pop">
          {toast.celebrate && (
            <Illustration name="celebrate" width={40} className="mx-0 shrink-0 motion-safe:animate-pop" />
          )}
          <p className="flex-1 text-sm">{t(toast.message)}</p>
          {toast.undo && (
            <button
              type="button"
              data-toast-focus
              onClick={onUndo}
              className={`${toastButton} border border-on-primary px-4`}
            >
              {t("undo")}
            </button>
          )}
          <button
            type="button"
            {...(!toast.undo && { "data-toast-focus": true })}
            onClick={onDismiss}
            className={`${toastButton} inline-flex min-w-11 items-center justify-center`}
          >
            <Icon icon={X} />
            <span className="sr-only">{t("close")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
