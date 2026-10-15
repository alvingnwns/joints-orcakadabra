# UI/UX redesign: audit and checkpoints

Brief: `ui-ux.md` ("Calm Intelligence"). Backend facts: `backend-contract.md`. Design skill: `.kiro/skills/hallmark` (installed this session).

Rules for this work: one checkpoint at a time, run the checks, report, wait for review. I never commit. The backend is not changed unless a checkpoint says so and you approve it.

Precedence when sources disagree: `ui-ux.md` (palette, information architecture, behavior) over Hallmark's defaults. From Hallmark I use the working disciplines only: locked tokens, all interactive states, mobile gates at 320/375/414/768, no invented content, pre-emit self-critique. I do not use its theme catalog or its project-memory file, because the palette is already fixed by `ui-ux.md`.

---

## 1. Baseline (run today, before any UI change)

| Check | Result |
|---|---|
| Backend `ruff check`, `ruff format --check` | pass |
| Backend `pytest -q` | 152 passed (needs Docker Postgres) |
| Frontend `npm run lint` | pass |
| Frontend `npm run typecheck` | pass |
| Frontend `npm test` | 92 passed, 15 files |
| Frontend `npm run build` | pass, routes `/`, `/week`, `/dump`, `/_not-found` |
| `sk-or-` in `.next` | none |

No regressions exist at the start.

## 2. Current architecture

- Next.js 16 App Router, React 19, TypeScript, Tailwind 4 (tokens in `app/globals.css` under `@theme`). No component library and no icon library. Geist font via `next/font`.
- Data: a small `apiFetch` wrapper (`lib/api.ts`), typed clients per area (`lib/tasks.ts`, `schedule.ts`, `dump.ts`, `chat.ts`, `workspace.ts`), `useLoad` hook for load/refresh, `useTaskActions` for actions with toast and undo.
- i18n: typed dictionaries `en.ts` and `id.ts` (114 keys each), a test fails if they differ.
- Shell: header with pill nav (Today, Week, Brain dump), About dialog, language switcher, connection banner, floating chat button, native `<dialog>` for chat and About, toast.
- All components use token classes. There are no hard-coded colors in `components/`, so a palette swap is a token change.
- Width is `max-w-3xl` (768 px) for every page.

## 3. What works and must be preserved

- Workspace lifecycle and stale-id recovery (`lib/workspace.ts`, tested).
- Local-date convention (`localDate`) sent as `today` on every schedule and AI call.
- Action flow: save first, then reload from the backend, so ordering always comes from the backend. Failed action changes nothing and shows a calm error.
- Undo on done, move, later, make-smaller, delete; focus kept after an action that removes the focused element.
- Quick-add keeps typed input on failure. Brain dump keeps text on failure and never saves before review.
- Native `<dialog>` for chat and About (focus trap, Esc, focus return).
- i18n parity test, `prefers-reduced-motion`, 44 px targets, skip link.
- Backend remains the only source of ranking. The frontend never computes priority.

## 4. Audit findings

Each item says where it comes from. "Verified" means I read the code or ran a check.

### A. Design tokens (verified by computing contrast)

Your starting tokens fail WCAG AA in these places:

| Pair | Ratio | Needed | Fix |
|---|---|---|---|
| secondary text `#737B76` on background `#F8F7F2` | 4.06 | 4.5 | darken to about `#5F6762` (5.43) |
| secondary text on surface `#FFFFFF` | 4.35 | 4.5 | same fix |
| secondary text on surface-muted `#F1F2EC` | 3.87 | 4.5 | same fix |
| danger `#B54747` on danger-soft `#F4DEDA` | 4.12 | 4.5 | darken danger text for use on the soft surface |
| border `#E4E7DF` on white, used as an input outline | 1.25 | 3.0 (UI components) | keep `--color-border` for dividers only; add a stronger `--color-border-strong` (about `#8A918C`, 3.23) for inputs and controls |

Passing as given: text, primary on white, primary-hover, primary as link text, primary on primary-soft, attention text on attention, focus ring (7.08).

### B. Illustrations vs new palette (verified)

The 12 SVGs use the navy outline `#2B3A55` and a cream blob (IMPLEMENTATION.md §4). The new palette is green and warm gray, so they will look off-brand, and `ui-ux.md` says illustrations must not compete with task content. Options are in section 7.

### C. Shell and navigation

- Top pill nav only. No mobile bottom navigation.
- Chat button is a fixed bottom-right pill. The toast sits at `bottom-20` on small screens to avoid it. These two floating elements are positioned by hand and can overlap content.
- No safe-area handling (`env(safe-area-inset-*)`) and no `dvh` units anywhere (verified by search).
- Content is capped at 768 px on desktop. The brief suggests about 1120 to 1280 px with the content at a readable width.
- Connection banner checks once on mount. It has a retry button, but never rechecks and does not say that a change was not saved.

### D. Today

- Cards show title, due date, estimate, checkbox, Delete, "Change plans". No priority label, no importance.
- The top 3 can include a task due days from now. Nothing explains that, which `ui-ux.md` requires.
- `priority_label` and `reasons` come from the backend but are never shown. `reasons` are English sentences, so they cannot be shown in Indonesian. Plan: build short localized lines from structured fields (`priority_label`, `due_date`, `estimated_minutes`, `impact_score`). This is display text, not a new score.
- Heavy-load "Move it" applies immediately (always to tomorrow). `ui-ux.md` requires a review step before applying. It also ignores `total_minutes`, `capacity_minutes` and `delay_suggestion.reason`.
- Delete is a visible danger-like button on every card. Actions are not grouped in one menu.

### E. Task data and editing

- `Task` type has no `description` and `TaskChanges` has no `impact_score` or `description`, though the API supports both.
- No Edit Task form. Only "Make it smaller" (title and estimate) and date moves. Cannot change importance, description, or clear a due date.
- Undo of delete re-creates the task, so it gets a new id and creation time (which is a ranking tie-break). It also does not carry `description` and resets `completed_at`. Undo copy must stay honest about this, and `restore()` must include `description` once it exists.
- `in_progress` exists in the API and is treated as active, identical to `todo` for ranking and load (`ACTIVE_STATUSES`). The UI never sets it. Decision needed (section 7).

### F. Week

- No task count per day (the API returns `task_count`; only minutes are shown).
- Load text reads "x / 240 min", not "90 of 240 minutes".
- Seven columns inside a 768 px container are narrow (about 90 px). Stacked on mobile.
- No way to add a task to the selected day. Task rows reuse `TaskItem`, so no edit either.

### G. Tasks hidden from every page (verified in code, and stated in `backend-contract.md`)

A task due more than 7 days out that is not in the top 3 appears nowhere. There is no task library, no search, and no completed history beyond "Done today". This is the most serious gap and needs a new route.

### H. Brain dump

- Draft impact is hard-coded to 3 and cannot be edited, unlike manual creation.
- `apiFetch` throws `ApiError(kind, status)` and discards the response body, so the UI cannot tell `ai_unavailable` from `ai_invalid_output` (both are HTTP 502). Network and timeout are distinguished (`kind`), 422 `no_tasks_found` is handled. Fix: carry the `detail` code on `ApiError` (frontend-only change in `lib/api.ts`).
- Draft cards highlight `needs_confirmation` and show the AI note. Good, keep.
- Saved state offers a link to Today. Keep.

### I. Chat

- One generic error for every failure.
- Three suggested questions. Chat has no actions, so it can never change data silently (good, keep it that way).
- Caption "Answers are based on your schedule" is present. It should also say the chat does not change tasks.

### J. Accessibility (partly verified by reading code)

- Native dialogs, labels, `aria-live` regions, skip link, 44 px targets and reduced-motion already exist.
- `:focus-visible` uses a 3 px ink outline. It must be re-checked against the new palette.
- Not yet verified in a browser: keyboard walk-through, screen reader output, 320 px layouts. Those happen in checkpoint 6.

### K. Not changed

Backend, API contract, workspace storage key, test setup.

---

## 5. Checkpoints

Each checkpoint ends with: lint, typecheck, tests, build, and a short report with the suggested commit message.

### CP-U0: Audit and baseline (this document)
- [x] Inspect code, read the contract, run the baseline, find gaps.
- [x] Install the design skill.
- [x] Decisions approved (all recommended defaults): add `lucide-react`; do not expose `in_progress`; darken failing tokens; keep only empty and error illustrations (recolored); route `/tasks` labelled "All tasks"; top nav on desktop plus bottom nav on mobile.

### CP-U1: Design tokens and shared components (done, waiting for your review)
- [x] `app/globals.css`: new palette, type scale (`text-display`, `text-section`, `text-meta`; body stays `text-base`/`text-sm`), radii (`rounded-control` 12, `rounded-card` 16, `rounded-dialog` 20), focus ring. Old token names (`ink`, `cream`, `peach`, `mint`, `sky`, `muted`, `line`) are removed; a search finds no leftovers.
- [x] AA fixes: secondary text `#5F6762`; new `--color-border-strong` `#7F8782` for controls (the light `--color-border` is for dividers only); new `--color-danger-text`, `--color-danger-hover`, `--color-on-primary`.
- [x] `app/tokens.test.ts` reads the real CSS and checks 28 foreground/background pairs, so a future color edit cannot break contrast unnoticed.
- [x] `components/ui/`: Button (+ `buttonClasses` for links), IconButton, Icon, Input/Textarea/Select/Field, Badge, Card, Skeleton, EmptyState, Notice, Dialog (controlled, on native `<dialog>`).
- [x] `lucide-react@1.57.0` pinned (exact).
- [x] Migrated every existing component to the primitives and tokens, no behavior change: shell, About, language switcher, connection banner, workspace loading and error, load states, Today, Week, task item and actions, quick add, Later list, heavy-load notice, toast, brain dump, chat panel, 404.
- [x] Illustrations in `frontend/public/illustrations` recolored to the new palette (109 color values). They are still all in use; the ones outside empty and error states are removed when their page is reworked (About in CP-U2, heavy-load in CP-U3, brain dump and chat in CP-U5). `assets/illustrations/` (the original placeholders) was not touched.
- [x] No new i18n keys were needed (no new user-facing text). Existing keys are unchanged, so `en` and `id` still match.
- [x] Tests: 140 pass (92 existing unchanged + 48 new: 29 token tests covering 28 contrast pairs, 19 primitive tests).

Things that look different, on purpose:
- Buttons are 12 px rounded rectangles, not pills. Primary is green, not navy.
- Delete on a task is now a quiet button with a trash icon; the confirmation shows Keep (outlined) and Delete (red).
- Errors use a soft red panel; the connection banner and heavy-load notice use amber.
- Cards have a thin border and no shadow; the first "Start here" card has a green edge.
- Language, About, Change plans, Add, Ask, Close, Remove and Why have icons next to their labels.

Not done in this checkpoint (belongs to later ones): layout width, bottom navigation, safe-area spacing for the chat button and toast (CP-U2); priority labels, edit dialog, review step for the heavy-load suggestion (CP-U3).

### CP-U2: Shell and navigation
- [ ] Desktop: header or sidebar with identity, nav, language, About. Wider content area with a readable inner width.
- [ ] Mobile: bottom navigation (Today, Week, All tasks, Brain dump). Chat entry and toast positioned together with safe-area padding, no overlap.
- [ ] Connection banner: clearer copy ("Changes can't be saved right now"), retry, and a recheck on window focus.
- [ ] Add the `/tasks` nav item as a placeholder target for CP-U4.
- [ ] Tests: nav `aria-current`, banner retry, language switch still persists.

### CP-U3: Today and task interactions
- [ ] One reusable `TaskCard` for Today, Week and the library: title, description (clamped), due date, estimate, importance, priority badge, completion control, one "More" menu (Edit, Move to tomorrow, Pick a day, Later, Delete).
- [ ] `EditTaskDialog`: title, description, due date with "No date", estimate, importance. Validation matches the backend (title 1 to 200, estimate 5 to 720 in steps of 5). Cancel, discard warning, save state, error keeps the form.
- [ ] Extend `Task`, `NewTask`, `TaskChanges` types with `description` and `impact_score`. QuickAdd gets an optional "More details" with the same fields.
- [ ] Priority explanation: short localized line per card from structured fields; explicit note when a top-3 task is not due today.
- [ ] Heavy-load notice: show "about X of 240 minutes", name the suggested task and why (`delay_suggestion.reason`), and a review step ("Move 'Task' to Fri 16 Oct?" with Apply and Cancel).
- [ ] Delete: confirmation dialog naming the task; undo copy that matches what undo really does; `restore()` carries `description`.
- [ ] Empty, loading, error states for every section.
- [ ] Tests: edit dialog (validation, cancel, discard, server error), heavy-load review flow, undo, card menu keyboard use.

### CP-U4: Week and All tasks
- [ ] Week: day buttons with date, task count, "90 of 240 minutes" text and bar, heavy state with text. Layout for 320 to 1440 px. "Add task" for the selected day (date pre-filled). Edit through `TaskCard`.
- [ ] New route `/tasks` (All tasks): tabs Active, Upcoming, Unscheduled, Later, Completed. Data from `GET /tasks` and client-side filtering only. Title search. Sorting limited to what is real: due date and created date (the backend ranking is shown only on Today).
- [ ] No-results and empty states per tab. Task counts per tab.
- [ ] Nothing falls outside every view: add a test that a task due in 30 days appears under Upcoming.
- [ ] Note in the UI and report: the list is not paginated because the API is not.
- [ ] Tests: filters, search, empty tabs, far-future task visible.

### CP-U5: Brain dump and AI companion
- [ ] Dump: roomy input, example text, character count, processing state, draft cards using the same fields as Edit (including importance), uncertain fields highlighted with the AI note, "Not saved yet" label until confirmation, saved confirmation with link.
- [ ] `ApiError` carries `detail`; separate messages for: no tasks, AI unavailable, invalid AI response, network or timeout. Text always kept.
- [ ] Chat: clearer header and caption ("suggestions only, nothing changes unless you do it"), better message layout, per-failure messages, retry. Suggested questions: keep the 3, add "What can I move to another day?". "Why this task?" on every card that has a ranking, not only the top 3.
- [ ] Tests: each error path, importance edit in drafts, retry in chat.

### CP-U6: Accessibility and responsive polish
- [ ] Keyboard walk-through of every flow and dialog; focus order and return.
- [ ] Contrast re-check of every used pair (script kept in the report).
- [ ] 320, 375, 414, 768, 1024, 1440 px checks; long titles; long Indonesian strings.
- [ ] Reduced motion; text zoom to 200 percent; no color-only status.
- [ ] Hallmark slop test and pre-emit critique run on each page.
- [ ] Lighthouse accessibility on Today, Week, All tasks, Dump (needs Chrome; if not available I will say so).

### CP-U7: Final verification and report
- [ ] Lint, typecheck, tests, build, secret scan, backend tests unchanged.
- [ ] Manual flows listed and what was and was not checked.
- [ ] Final deliverables from `ui-ux.md` section 19.

---

## 6. Backend changes to document, not build

None are needed for CP-U1 to CP-U7. Things that would need the backend later, kept separate per the brief:

| Wanted | Why not now |
|---|---|
| Configurable daily capacity | Fixed at 240; deferred as OPT6. |
| Server-side search, date-range or paginated task list | `GET /tasks` supports only `status`. Fine for a personal list; revisit if lists get large. |
| True restore after delete | Needs soft delete or an undelete endpoint. Today's undo re-creates the task. |
| Chat that can propose and apply changes | Chat is read-only by design; applying changes would need an explicit confirm flow and new endpoints. |
| Localized reasons from the backend | `reasons` are English; the UI builds its own localized lines instead. |

## 7. Decisions needed before CP-U1

1. Icons: add `lucide-react` (one new pinned dependency) as `ui-ux.md` suggests? Recommended: yes.
2. `in_progress`: the backend treats it exactly like `todo`, so a "Start" button would change nothing about ranking or load. Recommended: do not expose it, document that, and show it as "Active" if one ever appears.
3. Palette tokens: OK to darken the failing ones as listed in 4.A (secondary text, danger on soft, stronger input border)? Recommended: yes.
4. Illustrations: (a) keep the 12 and recolor them to the new palette, (b) keep only the empty and error states and drop the rest, or (c) replace with simple icons. Recommended: (b), recolored, because the brief asks for small, purposeful art.
5. New route name and nav label: `/tasks` and "All tasks". OK?
6. Navigation on desktop: top bar (as now) or left sidebar? Recommended: keep a top bar on desktop and add the bottom bar on mobile, because there are only four destinations.
