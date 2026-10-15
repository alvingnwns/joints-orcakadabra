import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "destructive";
export type ButtonSize = "md" | "lg";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-medium disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary not-disabled:hover:bg-primary-hover",
  secondary:
    "border border-border-strong bg-surface text-text not-disabled:hover:bg-surface-muted",
  quiet: "text-text not-disabled:hover:bg-surface-muted",
  destructive: "bg-danger text-on-primary not-disabled:hover:bg-danger-hover",
};

// 44 px is the minimum touch target; 48 px is for the one main action on a screen.
const SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

/** The same look for a <button> and for a link that behaves like one. */
export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md") {
  return cn(BASE, VARIANTS[variant], SIZES[size]);
}

type Props = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shown before the label. The label is always required: icons alone are ambiguous. */
  icon?: LucideIcon;
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  type = "button",
  className,
  children,
  ...rest
}: Props) {
  return (
    <button type={type} className={cn(buttonClasses(variant, size), className)} {...rest}>
      {icon && <Icon icon={icon} />}
      {children}
    </button>
  );
}
