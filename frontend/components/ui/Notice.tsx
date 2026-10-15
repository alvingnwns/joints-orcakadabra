import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type NoticeTone = "info" | "attention" | "error" | "success";

// Amber says "worth a look" without implying failure; red is only for real errors.
const TONES: Record<NoticeTone, { box: string; icon: string; title: string; glyph: LucideIcon }> = {
  info: { box: "bg-primary-soft text-text", icon: "text-primary", title: "", glyph: Info },
  success: {
    box: "bg-primary-soft text-text",
    icon: "text-primary",
    title: "",
    glyph: CircleCheck,
  },
  attention: {
    box: "bg-attention text-attention-text",
    icon: "text-attention-text",
    title: "",
    glyph: TriangleAlert,
  },
  error: {
    box: "bg-danger-soft text-text",
    icon: "text-danger",
    title: "text-danger-text",
    glyph: CircleAlert,
  },
};

type Props = {
  tone?: NoticeTone;
  title?: ReactNode;
  /** Heading level for the title (default: a plain bold line). */
  titleAs?: "p" | "h2" | "h3";
  titleId?: string;
  children?: ReactNode;
  /** Buttons or links shown under the message. */
  action?: ReactNode;
  /** Replaces the icon, e.g. with an illustration. */
  media?: ReactNode;
  /** Errors default to "alert" so they are announced; pass "status" for polite updates. */
  role?: "alert" | "status";
  className?: string;
};

/** An inline message that stays in the page flow. Always has text; the icon is a reinforcement. */
export function Notice({
  tone = "info",
  title,
  titleAs: Title = "p",
  titleId,
  children,
  action,
  media,
  role,
  className,
}: Props) {
  const style = TONES[tone];
  return (
    <div
      role={role ?? (tone === "error" ? "alert" : undefined)}
      className={cn("flex gap-3 rounded-card p-4", style.box, className)}
    >
      {media ?? <Icon icon={style.glyph} size={20} className={cn("mt-0.5", style.icon)} />}
      <div className="min-w-0 flex-1">
        {title && (
          <Title id={titleId} className={cn("font-semibold", style.title)}>
            {title}
          </Title>
        )}
        {children && <div className={cn(title ? "mt-1" : undefined, "text-sm")}>{children}</div>}
        {action && <div className="mt-3 flex flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
