import type { ComponentProps, ElementType } from "react";

import { cn } from "@/lib/cn";

export type CardTone = "surface" | "muted" | "emphasis" | "attention";

const TONES: Record<CardTone, string> = {
  surface: "border border-border bg-surface",
  muted: "border border-border bg-surface-muted",
  // The one task to start with: a clear edge, not a heavier shadow.
  emphasis: "border border-primary bg-surface ring-1 ring-primary",
  // Something worth a second look (e.g. an AI guess), with a soft amber edge.
  attention: "border border-attention-text/50 bg-surface",
};

type Props = Omit<ComponentProps<"div">, "ref"> & {
  as?: "div" | "section" | "article" | "li";
  tone?: CardTone;
  /** "md" is 16 px, "lg" is 24 px; "none" for cards that manage their own spacing. */
  padding?: "none" | "md" | "lg";
};

const PADDING = { none: "", md: "p-4", lg: "p-6" };

export function Card({ as = "div", tone = "surface", padding = "md", className, ...rest }: Props) {
  const Tag = as as ElementType; // a cast, so TypeScript doesn't narrow the props to one tag
  return <Tag className={cn("wrap-anywhere rounded-card", TONES[tone], PADDING[padding], className)} {...rest} />;
}
