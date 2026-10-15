import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

type Props = { icon: LucideIcon; size?: number; className?: string };

/**
 * One icon style for the whole app: same stroke, hidden from screen readers.
 * Icons never stand alone: the label next to them (or on the IconButton) says what they mean.
 */
export function Icon({ icon: Glyph, size = 18, className }: Props) {
  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      size={size}
      strokeWidth={2}
      className={cn("shrink-0", className)}
    />
  );
}
