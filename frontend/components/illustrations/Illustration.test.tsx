import { existsSync } from "node:fs";
import { join } from "node:path";

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { type IllustrationName, Illustration } from "./Illustration";

const NAMES: IllustrationName[] = [
  "welcome",
  "empty-tasks",
  "day-clear",
  "all-done",
  "celebrate",
  "heavy-load",
  "week-empty",
  "brain-dump",
  "untangling",
  "chat-helper",
  "connection-error",
  "oops",
];

describe("Illustration", () => {
  it.each(NAMES)("%s exists in public/illustrations", (name) => {
    expect(existsSync(join(process.cwd(), "public", "illustrations", `${name}.svg`))).toBe(true);
  });

  it("is decorative, so screen readers skip it", () => {
    const { container } = render(<Illustration name="day-clear" />);
    const img = container.querySelector("img")!;

    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("width", "160");
    expect(img).toHaveAttribute("height", "120"); // 4:3 artwork
  });

  it("keeps the celebrate burst square", () => {
    const { container } = render(<Illustration name="celebrate" width={80} />);

    expect(container.querySelector("img")).toHaveAttribute("height", "80");
  });
});
