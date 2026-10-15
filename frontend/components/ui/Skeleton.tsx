import { cn } from "@/lib/cn";

/** A placeholder block that keeps the layout steady while data loads. Hidden from screen readers. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-card bg-border motion-safe:animate-pulse", className)}
    />
  );
}
