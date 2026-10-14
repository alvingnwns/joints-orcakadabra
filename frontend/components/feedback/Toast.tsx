"use client";

import { Illustration } from "@/components/illustrations/Illustration";
import { useT } from "@/components/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/en";

export type ToastMessage = {
  message: TranslationKey;
  /** A finished task: shows the small check burst. */
  celebrate?: boolean;
  /** Present when the action can be undone. */
  undo?: () => Promise<unknown>;
};

type Props = { toast: ToastMessage | null; onUndo: () => void; onDismiss: () => void };

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
      className="fixed inset-x-4 bottom-20 z-40 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm"
    >
      {toast && (
        <div className="flex items-center gap-3 rounded-card bg-ink p-3 text-cream shadow-lg motion-safe:animate-pop">
          {toast.celebrate && (
            <Illustration name="celebrate" width={40} className="mx-0 shrink-0 motion-safe:animate-pop" />
          )}
          <p className="flex-1 text-sm">{t(toast.message)}</p>
          {toast.undo && (
            <button
              type="button"
              data-toast-focus
              onClick={onUndo}
              className="min-h-11 rounded-full border border-cream px-4 text-sm font-medium hover:bg-cream hover:text-ink"
            >
              {t("undo")}
            </button>
          )}
          <button
            type="button"
            {...(!toast.undo && { "data-toast-focus": true })}
            onClick={onDismiss}
            className="min-h-11 min-w-11 rounded-full text-lg leading-none hover:bg-cream hover:text-ink"
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">{t("close")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
