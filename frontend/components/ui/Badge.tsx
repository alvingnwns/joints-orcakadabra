import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "primary" | "attention" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-text-secondary",
  primary: "bg-primary-soft text-primary",
  attention: "bg-attention text-attention-text",
  danger: "bg-danger-soft text-danger-text",
};

type Props = { tone?: BadgeTone; icon?: LucideIcon; className?: string; children: ReactNode };

/** A short status or priority label. It always has text: color is never the only signal. */
export function Badge({ tone = "neutral", icon, className, children }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-meta font-medium",
        TONES[tone],
        className,
      )}
    >
      {icon && <Icon icon={icon} size={14} />}
      {children}
    </span>
  );
}
