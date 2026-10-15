import type { ReactNode } from "react";

import { Illustration, type IllustrationName } from "@/components/illustrations/Illustration";
import { Mascot, type MascotMood } from "@/components/ui/Mascot";
import { cn } from "@/lib/cn";

export type EmptyTone = "calm" | "neutral" | "error";

const TONES: Record<EmptyTone, string> = {
  calm: "bg-primary-soft",
  neutral: "border border-border bg-surface-muted",
  error: "bg-danger-soft",
};

type Props = {
  text?: ReactNode;
  title?: ReactNode;
  /** The heading level of the title; a page-level state (like "not found") should use h1. */
  titleAs?: "p" | "h1" | "h2" | "h3";
  /** Small art for a calm empty state. */
  illustration?: IllustrationName;
  illustrationWidth?: number;
  /** The mascot instead of art, for friendly moments (all done, something went wrong). */
  mascot?: MascotMood;
  tone?: EmptyTone;
  /** A button or link: the next step the person can take. */
  action?: ReactNode;
  role?: "alert" | "status";
  className?: string;
};

/** For "nothing here yet", "all done", and "could not load" states. Small art, plain words. */
export function EmptyState({
  text,
  title,
  titleAs: Title = "p",
  illustration,
  illustrationWidth = 180,
  mascot,
  tone = "calm",
  action,
  role,
  className,
}: Props) {
  return (
    <div role={role} className={cn("rounded-card p-6 text-center", TONES[tone], className)}>
      {mascot ? (
        <Mascot mood={mascot} size={112} className="mx-auto mb-3" />
      ) : (
        illustration && (
          <Illustration name={illustration} width={illustrationWidth} className="mb-4" />
        )
      )}
      {title && <Title className="text-section font-semibold">{title}</Title>}
      {text && <p className={title ? "mt-1" : undefined}>{text}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
