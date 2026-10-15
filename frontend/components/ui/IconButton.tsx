import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

type Props = Omit<ComponentProps<"button">, "children" | "aria-label"> & {
  /** Required: the accessible name, since there is no visible text. */
  label: string;
  icon: LucideIcon;
};

/** A square 44 px button with only an icon, for places where the meaning is obvious (close). */
export function IconButton({ label, icon, type = "button", className, ...rest }: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-control text-text not-disabled:hover:bg-surface-muted disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      <Icon icon={icon} />
    </button>
  );
}
