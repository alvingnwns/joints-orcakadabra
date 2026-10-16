/** Copies text to the clipboard. Returns false when the browser does not allow it. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false; // no permission, or an insecure page: the caller shows the manual way
  }
}
