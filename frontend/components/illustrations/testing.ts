/** Test helper: the illustration names currently shown inside `container`. */
export function shownIllustrations(container: HTMLElement): string[] {
  return [...container.querySelectorAll("img")]
    .map((img) => img.getAttribute("src")?.match(/illustrations\/(.+)\.svg/)?.[1])
    .filter((name): name is string => !!name);
}
