"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

export type DialogVariant = "center" | "side";

const VARIANTS: Record<DialogVariant, string> = {
  center:
    "m-auto w-[calc(100%-2rem)] max-w-md wrap-anywhere rounded-dialog border border-border bg-surface p-6 text-text shadow-lg backdrop:bg-text/40",
  // A slide-over panel on the right, full height.
  side: "m-0 ml-auto h-full max-h-none w-full max-w-md border-l border-border bg-surface p-0 text-text shadow-lg backdrop:bg-text/40",
};

type Props = {
  open: boolean;
  /** Called for Esc and a click on the backdrop. The parent decides by setting `open`. */
  onClose: () => void;
  /** id of the heading inside, used as the dialog's accessible name. */
  labelledBy: string;
  describedBy?: string;
  variant?: DialogVariant;
  /** While true (e.g. a save is running) Esc and the backdrop do not close the dialog. */
  locked?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * A controlled modal on the native <dialog> element. The browser provides the focus trap,
 * inert page behind it, and returning focus to the button that opened it.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  variant = "center",
  locked = false,
  className,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;

    // Remember who opened it, so focus goes back there when it closes. The browser does this
    // for a dialog that is closed in place, but not when the dialog is removed from the page
    // (the edit and delete dialogs are only mounted while open).
    const active = document.activeElement;
    const opener = active instanceof HTMLElement && !dialog.contains(active) ? active : null;
    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus(); // not if the opener is gone, e.g. a deleted task
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      // Esc: keep the browser from closing it by itself, so `open` stays the single source of truth.
      onCancel={(event) => {
        event.preventDefault();
        if (!locked) onClose();
      }}
      // A click on the backdrop lands on the <dialog> element itself, not on its content.
      onClick={(event) => {
        if (event.target === event.currentTarget && !locked) onClose();
      }}
      className={cn(VARIANTS[variant], className)}
    >
      {children}
    </dialog>
  );
}
