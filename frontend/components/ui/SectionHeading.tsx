import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type SectionTone = "primary" | "whenever" | "soon" | "later" | "done";

export const SECTION_TONES: Record<SectionTone, string> = {
  primary: "bg-primary-soft text-primary",
  whenever: "bg-whenever-badge text-whenever-text",
  soon: "bg-soon-badge text-soon-text",
  later: "bg-later-badge text-later-text",
  done: "bg-done-badge text-done-text",
};

type Props = {
  id: string;
  icon: LucideIcon;
  tone?: SectionTone;
  /** A small number next to the title, e.g. how many tasks are in the section. */
  count?: number;
  children: ReactNode;
};

/** A section title with a small colored icon, so the page reads as clearly separate groups. */
export function SectionHeading({ id, icon, tone = "primary", count, children }: Props) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={cn("flex size-8 items-center justify-center rounded-full", SECTION_TONES[tone])}
      >
        <Icon icon={icon} />
      </span>
      <h2 id={id} className="text-section font-bold">
        {children}
      </h2>
      {count !== undefined && (
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-meta font-semibold text-text-secondary">
          {count}
        </span>
      )}
    </div>
  );
}
