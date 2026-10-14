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
  workspaceLoading: "Getting your space ready…",
  workspaceError: "We couldn't set up your space just yet. Nothing is lost. Please try again.",

  tasksTitle: "Your tasks",
  tasksLoading: "Loading your tasks…",
  tasksLoadError: "We couldn't load your tasks right now. Nothing is lost.",
  tasksEmpty: "Nothing here yet — add one small thing.",
  taskActionError: "That didn't go through. Please try again.",

  addTaskLabel: "What's one thing to do?",
  addTaskButton: "Add",
  addError: "We couldn't save that just yet. What you typed is still here, so you can try again.",
  moreDetails: "More details",
  dueDateLabel: "Due date (optional)",
  estimateLabel: "Time needed, in minutes (optional)",
  impactLegend: "How much does it matter?",
  impactSmall: "Small deal",
  impactMatters: "Matters",
  impactReally: "Really matters",

  dueLabel: "Due",
  minutesShort: "min",
  deleteButton: "Delete",
  deleteConfirm: "Delete this task?",
  deleteYes: "Yes, delete",
  deleteKeep: "Keep it",
};

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;
