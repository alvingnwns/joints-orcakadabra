# MASTER PROMPT: CALM INTELLIGENCE — AI AUTO-SCHEDULER UI/UX REDESIGN

## 1. YOUR ROLE

Act as a senior product designer, UX researcher, design systems architect, accessibility specialist, and senior frontend engineer.

Your assignment is to redesign and improve the existing AI auto-scheduler application into a polished, production-quality experience.

Do not treat this as a superficial styling task. You are responsible for the complete user experience: information architecture, interaction design, visual hierarchy, task management workflows, AI transparency, accessibility, responsive behavior, error recovery, and implementation quality.

Work directly with the existing codebase. Inspect the current implementation before making changes. Preserve working business logic and backend integration unless a specific change is justified and approved.

Do not rebuild the entire application from scratch when incremental improvements are more appropriate.

## 2. PRODUCT VISION

The product is a calm, intelligent planning companion that helps users turn overwhelming thoughts into manageable plans.

The product should help users answer three questions:

1. What matters most right now?
2. What can realistically fit into my available capacity?
3. What should I do when my original plan no longer works?

The application must feel supportive, intelligent, lightweight, and trustworthy.

Its primary purpose is to reduce planning friction and cognitive overload, not to maximize the number of completed tasks.

### Core product principles

- Calm over pressure.
- Clarity over decoration.
- Progress over perfection.
- AI suggestions, human decisions.
- Recovery is a first-class feature.
- Transparency over mysterious automation.
- Useful defaults over excessive configuration.
- Accessibility over visual novelty.
- Consistency over unnecessary customization.

Never shame users for unfinished tasks, missed deadlines, changing priorities, or taking breaks.

Do not introduce punitive streaks, guilt-inducing notifications, aggressive red dashboards, productivity scores that judge the user, or language implying personal failure.

Use supportive language such as:
- "Let's find a manageable next step."
- "Your plan can change."
- "You have a lot on your plate. Want to move something?"
- "Nothing scheduled yet. You can start whenever you're ready."

Avoid:
- "You failed your daily goal."
- "You're falling behind again."
- "You wasted your day."
- "You must complete these tasks."

## 3. REQUIRED FIRST STEP: CODEBASE AUDIT

Before implementing anything:

1. Inspect the repository structure and identify the frontend framework, routing system, styling approach, component library, API client, and existing design tokens.
2. Read the backend contract at `backend-contract.md`, if available in the repository or provided project context.
3. Inspect all existing pages, shared components, forms, task actions, API calls, localization files, and tests.
4. Identify existing functionality that works and must be preserved.
5. Map every existing backend capability to its current UI.
6. Identify missing features, confusing flows, accessibility issues, and inconsistent states.
7. Check the current implementation rather than assuming the documented UI exactly matches the running application.
8. Produce a concise audit and prioritized implementation checklist before changing code.

Create a `TODO.md` or equivalent checkpoint document.

Divide work into small, reviewable checkpoints. Implement one checkpoint at a time, run the relevant tests, summarize the changes, and identify any unresolved issues before continuing.

Do not perform an uncontrolled full-application rewrite.

## 4. VISUAL DESIGN SYSTEM

### Design direction: Calm Intelligence

Use warm minimalism with subtle natural colors, generous whitespace, readable typography, soft surfaces, and restrained motion.

The application should feel like a thoughtfully designed personal workspace, not a generic corporate dashboard or a flashy AI demo.

### Color palette

Use these initial design tokens:

- `--color-background: #F8F7F2`
- `--color-surface: #FFFFFF`
- `--color-surface-muted: #F1F2EC`
- `--color-primary: #315C4C`
- `--color-primary-hover: #264A3D`
- `--color-primary-soft: #DCE8D8`
- `--color-text: #26332D`
- `--color-text-secondary: #737B76`
- `--color-border: #E4E7DF`
- `--color-focus: #315C4C`
- `--color-attention: #F5E8C8`
- `--color-attention-text: #694E17`
- `--color-danger: #B54747`
- `--color-danger-soft: #F4DEDA`
- `--color-success: #315C4C`

Treat these as starting tokens, not an excuse to ignore contrast requirements.

Validate actual foreground/background combinations for WCAG AA contrast. Adjust individual tokens if needed, especially muted text, focus indicators, and text displayed on colored surfaces.

Do not use color as the only indicator of priority, status, error, or completion.

Use destructive red only for genuinely destructive actions and error states. Use amber for information requiring attention without implying failure.

Avoid large decorative gradients, excessive glassmorphism, neon accents, strong drop shadows, and gradients behind ordinary text.

### Typography

Use the existing typography system if it is already well implemented. Otherwise, use Inter, Geist, or Plus Jakarta Sans.

Suggested scale:

- Display or major page heading: 28–32 px on desktop.
- Mobile page heading: 24–28 px.
- Section heading: 18–22 px.
- Body text: 14–16 px.
- Secondary text: 13–14 px.
- Compact metadata: never smaller than necessary for readability.

Use clear font weights and line heights. Keep paragraphs short. Avoid excessive uppercase labels and low-contrast microcopy.

### Spacing and shapes

Use a consistent 4 px or 8 px spacing scale.

Suggested starting values:

- Standard card radius: 16 px.
- Input radius: 10–12 px.
- Button radius: 10–12 px.
- Dialog radius: 16–20 px.
- Standard button height: 44–48 px.
- Minimum touch target: 44 × 44 CSS pixels where practical.
- Desktop content width: approximately 1120–1280 px, adjusted to the existing layout.
- Main content padding: approximately 24–32 px on desktop and 16–20 px on mobile.

Prefer subtle borders and surface contrast over heavy shadows.

Define reusable CSS variables or equivalent design tokens. Avoid scattered, duplicated hard-coded colors.

### Icons and illustrations

Use Lucide icons if compatible with the existing stack.

Keep icon size, stroke weight, and alignment consistent.

Use icons with labels for important actions. Do not rely on ambiguous icons alone.

Avoid decorative illustrations that compete with task content. Small, purposeful illustrations may be used for empty states if they remain lightweight and accessible.

## 5. INFORMATION ARCHITECTURE

Preserve and improve the application's existing core pages.

### A. Today — `/`

This is the primary landing page.

Its purpose is to help the user identify a reasonable next action without processing an overwhelming amount of information.

Recommended hierarchy:

1. A compact, friendly greeting and local date.
2. A clear page heading, such as "Today".
3. A prominent quick-add task input.
4. A primary section titled "Start here" or "Your next step".
5. Up to three recommended active tasks, using the existing backend ranking.
6. A secondary "Also today" section.
7. An actionable workload warning when the backend reports heavy load.
8. Collapsible "Later" and "Done today" sections.
9. A calm empty state when there are no active tasks.

Emphasize one recommended task rather than making all cards equally prominent.

Each task card should display the information necessary for a decision:
- Task title.
- Due date, if present.
- Estimated effort, if available.
- A compact priority label where useful.
- Completion control.
- A discoverable action menu.
- An explanation of why the task is recommended, when supported by backend data.

Keep secondary actions visually quiet.

Do not fabricate a recommendation or calculate a new priority in the frontend when the backend already supplies the authoritative ranking.

A task due later in the week may still appear among the top three recommendations. Explain this clearly instead of silently overriding the backend order.

### B. Week — `/week`

The weekly view should communicate distribution and capacity, not pressure.

Include:
- Seven days beginning with the user's current local date.
- Clear day selection.
- Task count per day.
- Estimated scheduled minutes.
- A readable capacity indicator.
- The selected day's task list.
- An unscheduled-task section.
- A clear way to create a task directly for the selected date.
- A way to open and edit existing tasks.

Use the current backend capacity value of 240 minutes per day unless a separately approved backend change introduces configurable capacity.

When showing load bars, provide text such as "90 of 240 minutes" alongside the visual indicator.

Do not use a full-looking day as a success indicator. Empty time is legitimate.

Past-date tasks may be represented in today's workload according to the backend rules. Do not independently invent a new scheduling interpretation.

Tasks due beyond the seven-day API window must remain discoverable in an appropriate task-library or upcoming view.

### C. Brain Dump — `/dump`

Design this page as a low-friction capture experience.

The user should be able to write naturally without first organizing the content.

Include:
- A spacious text input.
- A helpful example of what the user can enter.
- A primary action such as "Sort it out".
- A visible processing state.
- Editable AI-generated draft cards.
- Controls to remove individual drafts.
- Due date and effort fields.
- An impact selector consistent with manual task creation.
- Clear indicators for uncertain dates or AI assumptions.
- A review step before saving.
- A clear saved confirmation.

The AI parser returns drafts, not persisted tasks. Do not imply that a task is saved before the user confirms it.

Preserve user input when parsing fails.

Differentiate:
- No tasks detected.
- AI unavailable.
- Invalid AI response.
- Network failure.
- Successful parsing with drafts requiring confirmation.

Use concise, actionable error messages in the user's selected language.

Do not automatically save uncertain drafts.

### D. All Tasks / Task Library — add a new frontend route

Introduce a dedicated place to discover every task that is not visible in Today or Week.

This addresses a critical discoverability issue: tasks due beyond the seven-day schedule window may otherwise be invisible.

Organize tasks into useful views or filters:
- Active.
- Upcoming.
- Unscheduled.
- Later / deferred.
- Completed.

Include:
- Search by task title.
- Status filters.
- Clear empty states.
- A consistent edit action.
- Sorting that does not imply unimplemented backend capabilities.
- An accessible task list that works on mobile.

Use existing endpoints and client-side filtering where appropriate.

The existing `GET /tasks?status=` endpoint supports status filtering. Do not assume it supports server-side search, arbitrary date ranges, or pagination unless the actual implementation confirms it.

Do not introduce an invisible task state merely because it does not belong in the current day's plan.

### E. AI Companion

Preserve the existing slide-over AI chat interface.

It should feel like an optional helper, not a mandatory workflow.

Include:
- A clear title and close button.
- Suggested questions.
- A readable conversation layout.
- A visible sending/loading state.
- Retry behavior when the AI is unavailable.
- A clear distinction between AI recommendations and actual saved changes.

Example prompts:
- "Why is this my next priority?"
- "Can I make today's plan more manageable?"
- "What should I move to another day?"
- "Help me break this task into a smaller next step."

The existing chat endpoint returns an answer and does not persist chat history. Do not invent chat history or imply that chat actions automatically modify tasks.

AI-generated suggestions should require an explicit user action before they change task data.

### F. Shared application shell

Maintain consistent shared elements:
- Application identity and short tagline.
- Primary navigation.
- Language switcher for English and Indonesian.
- About dialog.
- Backend connection status.
- AI assistant entry point.
- Toast notifications.

Use a desktop sidebar or compact top navigation based on the current implementation.

On mobile, use a compact bottom navigation for the most important destinations. Avoid excessive floating controls and overlapping content.

Every floating element must respect mobile safe areas, keyboard visibility, and the page's primary actions.

## 6. TASK CARD AND TASK DETAIL DESIGN

Design one reusable task component for all relevant pages.

A task should expose:
- Title.
- Optional description.
- Optional due date.
- Optional estimated minutes.
- Impact importance.
- Status.
- Priority label where applicable.
- Completion control.
- More-actions menu.

Support the existing statuses:
- `todo`
- `in_progress`
- `done`
- `deferred`

The backend accepts `in_progress`, but the existing UI does not expose it. Inspect the actual code and make an explicit decision:
- Introduce a clear "Start task" / "In progress" interaction if this status should be supported; or
- Keep the UI simpler and document that the status is intentionally not exposed.

Do not show an action that the application cannot persist.

Create one complete Edit Task form or dialog that supports:
- Title.
- Description.
- Due date.
- Clearing the due date.
- Estimated effort.
- Impact score.
- Save and cancel.

Use the existing task PATCH endpoint for supported field updates.

Validate titles and estimates according to backend constraints. Do not permit empty titles or invalid estimates to be submitted.

Keep manual task creation, task editing, and AI draft editing visually consistent.

## 7. AI PRIORITY TRANSPARENCY

The backend is the source of truth for task scoring.

The current score is computed from urgency, impact, and an effort penalty. Do not reimplement this calculation as a competing frontend algorithm.

Use the returned `priority_label` values:
- `focus`
- `soon`
- `whenever`

Translate them into friendly, localized labels.

Explain recommendations in plain language using supported backend data.

Prefer concise explanations such as:
- "Due today."
- "Important and time-sensitive."
- "A shorter task that fits into your current plan."

Only display a reason when the underlying data supports it.

For the "Why this task?" interaction, show a small inline explanation or open the AI companion with the selected task context.

Do not present AI estimates or inferred dates as facts.

If the backend reports that a draft needs confirmation, explicitly highlight what the user should verify.

Avoid exposing raw backend reason strings or internal scoring formulas unnecessarily.

## 8. WORKLOAD WARNING AND RESCHEDULING

When `heavy_load` is present, show a supportive and actionable warning.

Use the returned `total_minutes`, `capacity_minutes`, and reason to explain the situation.

Example:
"You have about 300 minutes of planned work against a 240-minute daily capacity. Want to move something?"

If `delay_suggestion` is present, use its task identifier and reason to offer a specific proposal.

The user must be able to review the proposed change before applying it.

Do not silently reschedule tasks.

Clearly distinguish:
- A suggestion.
- A user-approved plan change.
- A successfully persisted change.

If an update fails, retain the previous visible state or revert optimistic updates correctly.

Do not promise that the backend optimizes every task into a fully time-blocked calendar. The current contract describes task ordering and daily/weekly summaries, not a complete time-block scheduling engine.

## 9. INTERACTION DESIGN AND SAFETY

Implement consistent interaction patterns across the application.

### Create

- Use inline quick-add for simple tasks.
- Offer a more complete form when users need additional fields.
- Validate fields before submission.
- Disable repeated submission while the request is in progress.
- Preserve the form when the request fails.
- Confirm success with a brief, specific message.

### Edit

- Make edit actions discoverable.
- Keep the form populated with current values.
- Support cancel without saving.
- Warn about discarding unsaved changes if meaningful edits would otherwise be lost.
- Handle server errors without silently discarding the user's work.

### Complete and undo

- Make completion a simple, reversible action where possible.
- Provide subtle visual feedback.
- Include an Undo action if the current implementation can reliably restore the previous status.
- Do not force a confirmation dialog for ordinary reversible completion actions.

### Delete

- Use a clear confirmation dialog or inline confirmation.
- Identify the task being deleted.
- Use neutral, explicit language.
- Offer Cancel and Delete actions.
- Never make Delete the visually dominant action by default.
- If a reliable undo mechanism exists, provide a short-lived Undo action after deletion.
- If deletion cannot be undone, say so before confirmation.
- Never claim that deletion can be undone unless a working restoration mechanism exists.

### Reschedule and defer

- Present the target date or the Later destination clearly.
- Keep the current date visible during editing.
- Ask for confirmation when an action is ambiguous or materially changes the plan.
- Use lightweight feedback for straightforward actions with obvious outcomes.
- Provide an Undo action only when it truly restores the previous data.

### Dialog behavior

- Move focus into the dialog when opened.
- Keep keyboard focus within modal dialogs.
- Support Escape for non-destructive dismissal.
- Restore focus to the triggering element when closed.
- Use appropriate accessible names and descriptions.
- Avoid nested dialogs.
- Do not close a dialog unexpectedly while a save is in progress.

### Toasts and notifications

- Keep messages concise and specific.
- Use accessible live-region announcements where appropriate.
- Avoid showing duplicate notifications for one action.
- Keep Undo controls available long enough to be useful.
- Do not rely on color alone to convey success or failure.

## 10. EMPTY, LOADING, ERROR, AND RECOVERY STATES

Every page must have deliberate designs for:

- Initial loading.
- Empty data.
- No search results.
- All tasks completed.
- AI processing.
- AI unavailable.
- Network unavailable.
- Server error.
- Validation failure.
- Stale workspace identifier.
- Failed save.
- Failed delete.
- Failed reschedule.
- Partial or uncertain AI parsing results.

Use skeleton loading states when they improve perceived stability. Avoid large layout shifts.

The application already has a backend health endpoint and a connection banner. Preserve this capability and improve its copy, retry interaction, and visual prominence.

When the server is unreachable:
- Preserve the user's unsaved input.
- Explain that the change was not saved.
- Provide a clear retry action.
- Never show a false success state.
- Do not implement a complex offline synchronization system unless explicitly approved.

Workspace identity is stored in local storage and sent using the `X-Workspace-Id` header. Preserve the existing workspace lifecycle and stale-workspace recovery behavior.

Do not expose workspace identifiers to users unnecessarily.

## 11. ACCESSIBILITY REQUIREMENTS

Target WCAG 2.2 AA where applicable.

Implement:
- Semantic HTML.
- Proper heading hierarchy.
- Explicit form labels.
- Keyboard-accessible controls.
- Visible focus states.
- Sufficient contrast.
- Accessible dialog behavior.
- Screen-reader announcements for important state changes.
- Descriptive button labels.
- Accessible validation errors.
- Reduced-motion support.
- Responsive text sizing.
- Touch-friendly controls.
- No color-only status indicators.

Ensure task cards remain understandable when icons are hidden or the application is used with a screen reader.

Use tooltips only for supplementary information, never for essential instructions.

Do not make hover the only way to reveal an important action.

## 12. RESPONSIVE BEHAVIOR

Design and test at representative widths:
- Small mobile: approximately 320–375 px.
- Standard mobile: approximately 390–430 px.
- Tablet: approximately 768 px.
- Desktop: approximately 1024–1440 px.
- Wide desktop: 1440 px and above.

On mobile:
- Prioritize the next actionable task.
- Avoid multi-column layouts that squeeze text.
- Use bottom sheets or appropriately sized dialogs for task actions.
- Keep the primary CTA visible without obstructing content.
- Avoid horizontal scrolling except for deliberately designed, usable components.
- Ensure the keyboard does not cover active form fields.
- Respect safe-area insets.

On desktop:
- Use a stable navigation structure.
- Keep the primary content at a readable width.
- Avoid excessive empty space or unnecessarily wide task cards.
- Use additional columns only when they improve comparison or scanning.

Do not simply shrink the desktop design. Reorganize content according to the user's context and screen size.

## 13. MOTION AND MICROINTERACTIONS

Use restrained motion to explain state changes.

Examples:
- Subtle completion transition.
- Gentle appearance of newly added tasks.
- Smooth opening and closing of the AI panel.
- Clear loading indicators.
- Small visual confirmation after successful actions.

Prefer short transitions, approximately 150–250 ms, when appropriate.

Respect `prefers-reduced-motion`.

Never use long animations that block task interaction.

Do not add decorative animation to every card, button, or section.

## 14. INTERNATIONALIZATION

The application supports English (`en`) and Indonesian (`id`).

All new user-facing text must use the existing localization system.

Update both locale files for every new label, error, confirmation, empty state, and accessibility string.

Do not hard-code new English text inside components when an internationalization key is required.

Ensure Indonesian translations are natural and supportive rather than literal, robotic translations.

Format dates and times according to the user's locale where appropriate. Follow the existing local-date convention and do not introduce timezone assumptions into date-only API fields.

## 15. BACKEND CONTRACT AND TECHNICAL CONSTRAINTS

Preserve the current API contract unless an approved implementation checkpoint explicitly introduces a backend change.

Current conventions:
- API base URL: `NEXT_PUBLIC_API_URL`.
- No login is currently implemented.
- Workspace ID is maintained in local storage.
- Task and chat endpoints require `X-Workspace-Id`.
- Dates use `YYYY-MM-DD` and represent the user's local calendar date.
- Supported locales are English and Indonesian.
- Standard API calls have an 8-second timeout.
- Task parsing has a 45-second timeout.
- Backend scoring is authoritative.

Important endpoints:
- `GET /health`
- `POST /workspaces`
- `GET /workspaces/{id}`
- `POST /tasks`
- `GET /tasks?status=`
- `GET /tasks/{id}`
- `PATCH /tasks/{id}`
- `DELETE /tasks/{id}`
- `POST /tasks/bulk`
- `GET /tasks/today?today=YYYY-MM-DD`
- `GET /tasks/week?today=YYYY-MM-DD`
- `POST /tasks/parse`
- `POST /chat/query`

The parser returns drafts and does not save them. Bulk creation persists reviewed tasks.

Do not invent endpoints, response fields, permissions, AI capabilities, or data persistence.

Do not calculate a new priority ranking in the frontend.

Do not claim that the app has notifications, calendar integrations, automatic time blocking, authentication, cloud synchronization across devices, configurable capacity, or persistent chat history unless the existing implementation proves that those features exist.

## 16. PROPOSED FEATURE GAPS

Implement frontend-only improvements first when they can be achieved safely using the current contract.

Potential improvements include:
- A complete Edit Task flow.
- A dedicated All Tasks / Upcoming view.
- Completed-task history.
- Add-task actions directly from the Week view.
- Better priority explanations.
- A more informative workload warning.
- Impact editing.
- Clearing due dates.
- Improved draft review in Brain Dump.
- A consistent task-action menu.

Some capabilities may require backend changes.

Do not invent backend support for:
- User-configurable daily capacity.
- Arbitrary date-range queries.
- Server-side search or pagination.
- Persistent workspace names.
- Recoverable deletion if no reliable recovery mechanism exists.
- Attachments, projects, or time-block scheduling.

If a feature requires an API change, document:
1. The user problem.
2. The proposed behavior.
3. The required endpoint or schema change.
4. The frontend impact.
5. The acceptance criteria.

Keep these proposals separate from the implementation of already supported functionality.

## 17. IMPLEMENTATION WORKFLOW

Follow these checkpoints in order, adapting them to the actual repository.

### Checkpoint 0 — Audit and baseline

- Inspect the codebase.
- Read the backend contract.
- Run the existing application and tests if possible.
- Identify regressions already present.
- Document the existing architecture.
- Produce a prioritized TODO list.
- Establish a baseline for build, lint, and tests.

Do not start a broad redesign before understanding the current code.

### Checkpoint 1 — Design tokens and shared components

Implement:
- Color tokens.
- Typography.
- Spacing.
- Buttons.
- Inputs.
- Cards.
- Dialogs.
- Badges.
- Toasts.
- Loading skeletons.
- Empty-state components.

Preserve existing behavior while replacing inconsistent styles.

### Checkpoint 2 — Application shell and navigation

Improve:
- Header.
- Desktop navigation.
- Mobile navigation.
- Connection banner.
- Language switcher.
- AI assistant entry point.
- Responsive shell.

Verify that every route remains accessible.

### Checkpoint 3 — Today and task interactions

Improve:
- Task hierarchy.
- Quick-add.
- Completion.
- Editing.
- Delete confirmation.
- Rescheduling.
- Defer and restore.
- Undo behavior where supported.
- Heavy-load feedback.
- Empty and error states.

Verify that all actions persist correctly.

### Checkpoint 4 — Week and All Tasks

Improve:
- Weekly load visualization.
- Selected-day experience.
- Add-task-from-day flow.
- Unscheduled tasks.
- Upcoming tasks.
- Completed history.
- Search and filtering.

Verify that tasks do not disappear merely because they fall outside the current weekly window.

### Checkpoint 5 — Brain Dump and AI Companion

Improve:
- Input experience.
- AI processing state.
- Draft editing.
- Uncertainty indicators.
- Confirmation before saving.
- Partial failure handling.
- Chat panel.
- Suggested prompts.
- Localization.

Ensure that AI output is not presented as persisted data before it is saved.

### Checkpoint 6 — Accessibility and responsive polish

Test:
- Keyboard navigation.
- Dialog focus.
- Screen-reader labels.
- Contrast.
- Reduced motion.
- Mobile layouts.
- Small-screen forms.
- Long task titles.
- Empty and error states.

### Checkpoint 7 — Final verification

Run the available:
- Build.
- Lint.
- Type checks.
- Unit tests.
- Integration tests.
- End-to-end tests, if configured.

Manually verify critical user flows and report any limitations.

Do not claim that a test passed if it was not actually run.

## 18. ACCEPTANCE CRITERIA

The redesign is complete only when all applicable criteria are met.

### Visual quality
- A coherent, reusable design system exists.
- Components share consistent spacing, typography, colors, and states.
- The interface is calm and visually hierarchical.
- There is no unnecessary decoration that competes with task content.

### Functional correctness
- Existing backend integration still works.
- Task creation and editing persist correctly.
- Delete and status transitions behave correctly.
- Undo is only offered when restoration is real.
- Brain Dump drafts require review before saving.
- All existing task statuses are handled deliberately.
- Tasks outside the weekly window remain discoverable.

### UX quality
- The next action is easy to identify.
- Important decisions are explained.
- AI suggestions never silently change persisted tasks.
- Errors explain what happened and what the user can do next.
- Users can recover from common mistakes.
- The application does not use guilt-inducing language.

### Accessibility
- Core flows work with a keyboard.
- Focus states are visible.
- Dialogs are accessible.
- Contrast is adequate.
- Important status changes are announced appropriately.

### Reliability
- No false success messages.
- No silent loss of unsaved input on ordinary API failures.
- No duplicate submissions caused by repeated clicks.
- No invented backend capabilities.
- No broken routes or regressions in existing workflows.

## 19. FINAL DELIVERABLES

At the end of the work, provide:

1. A summary of the implemented design changes.
2. The final design tokens and component conventions.
3. The routes and user flows improved.
4. A list of backend changes that would be required for future enhancements.
5. A list of files changed.
6. The tests and validation commands actually executed, with their results.
7. Any known limitations or unresolved issues.
8. A short prioritized list of recommended next improvements.

Work incrementally. Keep the code understandable. Prefer small, reversible changes over unnecessary architectural rewrites.

Your final goal is not to make the application look more complicated or more "AI-powered."

Your goal is to make it feel thoughtful, reliable, easy to understand, and genuinely helpful when the user's day does not go according to plan.