import { Hourglass, Leaf, TriangleAlert, type LucideIcon } from "lucide-react";

import type { LoadLevel } from "@/lib/load";

/** The look of each load level. Soft green is calm, amber is "nearly full", coral is "full". */
export const LEVEL_STYLE: Record<
  LoadLevel,
  { card: string; date: string; muted: string; bar: string; icon: LucideIcon | null }
> = {
  none: {
    card: "border-border bg-surface",
    date: "text-text",
    muted: "text-text-secondary",
    bar: "bg-primary",
    icon: Leaf,
  },
  light: {
    card: "border-border bg-surface",
    date: "text-text",
    muted: "text-text-secondary",
    bar: "bg-primary",
    icon: null,
  },
  busy: {
    card: "border-soon bg-soon-soft",
    date: "text-soon-text",
    muted: "text-text-secondary",
    bar: "bg-soon",
    icon: Hourglass,
  },
  full: {
    card: "border-warm bg-warm-soft",
    date: "text-warm-text",
    muted: "text-text-secondary",
    bar: "bg-warm",
    icon: TriangleAlert,
  },
};
