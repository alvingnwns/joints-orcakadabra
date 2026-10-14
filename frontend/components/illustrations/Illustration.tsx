import Image from "next/image";

/** The placeholder illustrations from §4 of IMPLEMENTATION.md, in public/illustrations. */
export type IllustrationName =
  | "welcome"
  | "empty-tasks"
  | "day-clear"
  | "all-done"
  | "celebrate"
  | "heavy-load"
  | "week-empty"
  | "brain-dump"
  | "untangling"
  | "chat-helper"
  | "connection-error"
  | "oops";

type Props = {
  name: IllustrationName;
  /** Rendered width in px; height follows the 4:3 artwork (celebrate is square). */
  width?: number;
  className?: string;
};

/**
 * Decorative: every illustration sits next to text that already says the same thing, so it is
 * hidden from screen readers (alt=""). Swapping the final artwork only means replacing the file.
 */
export function Illustration({ name, width = 160, className = "" }: Props) {
  const height = name === "celebrate" ? width : Math.round((width * 3) / 4);
  return (
    <Image
      src={`/illustrations/${name}.svg`}
      alt=""
      width={width}
      height={height}
      unoptimized // SVGs need no resizing; this also avoids enabling SVG optimisation
      className={`mx-auto ${className}`}
    />
  );
}
