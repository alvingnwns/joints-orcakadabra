/** English is the source of truth: every other language must define the same keys. */
export const en = {
  appName: "Orca",
  tagline: "One small step at a time",
  skipToMain: "Skip to main content",
  languageLabel: "Language",
  connecting: "Connecting…",
  serverUnreachable:
    "We can't reach the server right now. Nothing is lost, so try again in a moment.",
  tryAgain: "Try again",
  welcomeTitle: "Welcome",
  welcomeBody: "Your tasks will live here soon. There's no rush. We'll take it one step at a time.",
  workspaceLoading: "Getting your space ready…",
  workspaceError: "We couldn't set up your space just yet. Nothing is lost. Please try again.",
};

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;
