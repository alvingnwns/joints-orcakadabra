import Image from "next/image";

import { cn } from "@/lib/cn";

/**
 * The app's mascot, used sparingly: the greeting on Today, the chat helper, and friendly error
 * screens. Each mood is one file in public/mascot/<mood>.svg, so the final artwork can replace
 * the placeholders with no code change (keep the same four file names, any square-ish SVG).
 */
export type MascotMood = "hello" | "think" | "happy" | "oops";

export const MASCOT_MOODS: MascotMood[] = ["hello", "think", "happy", "oops"];

type Props = { mood?: MascotMood; size?: number; className?: string };

/** Decorative: whatever it "says" is always written next to it, so screen readers skip it. */
export function Mascot({ mood = "hello", size = 96, className }: Props) {
  return (
    <Image
      src={`/mascot/${mood}.svg`}
      alt=""
      width={size}
      height={size}
      unoptimized // SVGs need no resizing
      className={cn("shrink-0 select-none", className)}
    />
  );
}
