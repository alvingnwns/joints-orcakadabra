import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "attention"
  | "danger"
  | "focus"
  | "soon"
  | "whenever"
  | "later"
  | "done";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-text-secondary",
  primary: "bg-primary-soft text-primary",
  attention: "bg-attention text-attention-text",
  danger: "bg-danger-soft text-danger-text",
  // Task statuses: five clearly different hues, each with its own word and icon.
  focus: "bg-primary text-on-primary",
  soon: "bg-soon-badge text-soon-text",
  whenever: "bg-whenever-badge text-whenever-text",
  later: "bg-later-badge text-later-text",
  done: "bg-done-badge text-done-text",
};

type Props = { tone?: BadgeTone; icon?: LucideIcon; className?: string; children: ReactNode };

/** A short status or priority label. It always has text: color is never the only signal. */
export function Badge({ tone = "neutral", icon, className, children }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-meta font-semibold",
        TONES[tone],
        className,
      )}
    >
      {icon && <Icon icon={icon} size={14} />}
      {children}
    </span>
  );
}
