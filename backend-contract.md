# Backend contract and UI coverage

This document lists everything the backend provides, what the frontend currently does with it, and what has no UI yet. Use it as the brief for the UI/UX pass.

Source of truth: `backend/app/routers/*`, `backend/app/schemas.py`, `backend/app/services/*`, and the frontend in `frontend/components` and `frontend/lib`. The "current UI" columns come from reading the code, not from running the app, so check anything surprising in the browser.

Base URL: `NEXT_PUBLIC_API_URL` (local default `http://127.0.0.1:8000`). Interactive API docs are at `/docs`.

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Identity | No login. `POST /workspaces` returns an id, the frontend keeps it in `localStorage` (`orca.workspaceId`) and sends it as header `X-Workspace-Id` on every request except `/health` and `/workspaces*`. |
| Missing or malformed workspace header | 422. Unknown workspace id: 404. The frontend replaces a stale id on 404/422 only; on server or network errors it keeps the id. |
| Dates | `YYYY-MM-DD`, the user's local calendar date, no timezone. The frontend sends `today` itself (`localDate()`); the backend never guesses a timezone. |
| Isolation | A task from another workspace returns 404, same as a missing task. |
| Scoring | Computed by the backend, never by the AI. Scores are recomputed fresh for the user's `today` on schedule reads. |
| Errors from the AI | `detail` is a code, not a sentence: `ai_unavailable`, `ai_invalid_output`, `no_tasks_found`. The frontend shows its own text in the user's language. |
| Language | Only `en` and `id`. UI strings live in `frontend/lib/i18n/{en,id}.ts` and a test fails if `id` misses a key. The backend returns no user-facing sentences, except the chat answer and the AI draft `note`, which follow the `locale` field. |
| Client timeout | 8 s for normal calls, 45 s for `/tasks/parse`. |
| Rate limiting | None per user. The OpenRouter key's credit limit is the only cap. |

---

## 2. Data model

### Task

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `workspace_id` | uuid | |
| `title` | string | 1 to 200 characters, trimmed. |
| `description` | string or null | Free text. **No UI to enter or show it.** |
| `due_date` | date or null | |
| `estimated_minutes` | int or null | 5 to 720. Counts as 30 minutes for load calculations when null (stored value stays null). |
| `impact_score` | int | 1 to 5, default 3. UI uses three choices: 1 "Small deal", 3 "Matters", 5 "Really matters". |
| `urgency_score`, `priority_score`, `priority_label` | int, int, string or null | Null for done and deferred tasks. `priority_label` is `focus` (score 8+), `soon` (6 to 7) or `whenever` (below 6). |
| `status` | `todo` / `in_progress` / `done` / `deferred` | `deferred` is the "Later" list. `in_progress` is accepted by the API but **nothing in the UI sets or shows it**. |
| `source_type` | `manual` / `ai_parsed` | Set by the backend. Not shown in the UI. |
| `ai_summary` | string or null | Column exists but nothing writes it. Unused. |
| `created_at`, `updated_at`, `completed_at` | datetime | `completed_at` is set when status becomes `done` and cleared when it stops being `done`. |

### Workspace

`id`, `name` (always null, no endpoint sets it), `created_at`.

### Constants

Daily capacity is a fixed 240 minutes (`DAILY_CAPACITY_MINUTES`). Users cannot change it yet (deferred as OPT6).

---

## 3. Endpoints

All task and chat endpoints require `X-Workspace-Id`.

### Health and workspace

| Method and path | Purpose | Response |
|---|---|---|
| `GET /health` | Liveness, used by the connection banner. | `{"status":"ok"}` |
| `POST /workspaces` | Create a workspace. | 201 `{id, name, created_at}` |
| `GET /workspaces/{id}` | Check a stored id still exists. | 200, or 404 |

### Tasks

| Method and path | Request | Response | Errors |
|---|---|---|---|
| `POST /tasks` | `{title, description?, due_date?, estimated_minutes?, impact_score?=3}` | 201 Task | 422 field errors |
| `GET /tasks?status=` | Optional status filter. | Task[] ordered by `created_at` | |
| `GET /tasks/{id}` | | Task | 404 |
| `PATCH /tasks/{id}` | Any of `title, description, due_date, estimated_minutes, impact_score, status`. Only sent fields change. `due_date`, `estimated_minutes`, `description` may be `null` to clear. `title`, `impact_score`, `status` cannot be null. | Task | 404, 422 |
| `DELETE /tasks/{id}` | | 204 | 404 |
| `POST /tasks/bulk` | `{tasks: TaskCreate[1..50]}`. One invalid item rejects all. Saved with `source_type=ai_parsed`. | 201 Task[] | 422 |

### Schedule

| Method and path | Request | Response |
|---|---|---|
| `GET /tasks/today?today=YYYY-MM-DD` | `today` optional but the frontend always sends it. | `{today, top[≤3], rest[], heavy_load, delay_suggestion}` |
| `GET /tasks/week?today=YYYY-MM-DD` | same | `{today, capacity_minutes, days[7], unscheduled}` |

Scheduled tasks are Task plus `reasons: string[]` (English phrases such as "it is due tomorrow", meant as AI chat context, not UI copy).

`heavy_load`: `null` or `{is_heavy:true, reason:"over_capacity"|"many_long_tasks", total_minutes, capacity_minutes}`.
`delay_suggestion`: `null` or `{task_id, reason:"past_its_date"|"lowest_priority"}`. It is always present when `heavy_load` is.

Each `days[i]` and `unscheduled` is `{date (null for unscheduled), total_minutes, task_count, is_heavy, tasks[]}`.

### Brain dump (AI)

| Method and path | Request | Response | Errors |
|---|---|---|---|
| `POST /tasks/parse` | `{text (1..5000), today, locale}` | `{drafts:[{title, due_date, estimated_minutes, needs_confirmation, note}]}`, at most 20. Nothing is saved. | 422 `no_tasks_found`, 502 `ai_unavailable`, 502 `ai_invalid_output` |

`needs_confirmation` is true when the AI guessed, or when a date is in the past. `note` is one short sentence in the user's language saying what to check.

### Chat (AI)

| Method and path | Request | Response | Errors |
|---|---|---|---|
| `POST /chat/query` | `{question (1..500), today, locale, task_id?}` | `{answer}` | 404 task not found, 502 `ai_unavailable` / `ai_invalid_output` |

With `task_id` the answer is about that one task and its rank. Without it, it uses the Today and Week summary. Nothing is stored, so there is no history. Off-topic questions get a polite redirect from the model.

---

## 4. Business rules the UI must respect

**Priority** (`score = urgency + impact - effort_penalty`):
- Urgency: no date or 8+ days = 1, 4 to 7 days = 2, 2 to 3 days = 3, tomorrow = 4, today or past = 5.
- Effort penalty: 1 if the estimate is over 120 minutes.
- Ties break by due date, then creation time, then id.

**Today:**
- `top` is the first 3 active tasks by score, whatever their date. A task due in 5 days can appear under "Start here".
- `rest` is the remaining tasks that are due today, past their date, or undated.
- Done and deferred tasks are excluded from both.

**Heavy load** applies to tasks due today or earlier: more than 240 minutes in total, or more than 2 tasks over 120 minutes.

**Week:**
- 7 days starting at `today`. Past-date tasks are counted on today. Undated tasks go to `unscheduled`.
- Tasks due later than day 7 are in no bucket.
- Done and deferred tasks are excluded.

**Plan changes** are all `PATCH` calls:
- Move to tomorrow, or to another day: change `due_date`.
- Not today (Later): set `status=deferred`.
- Bring back: set `status=todo`.
- Make it smaller: change `title` and `estimated_minutes`.
- Done and undone: set `status=done` or `todo`.

---

## 5. Pages and components today

| Page | Route | What it contains |
|---|---|---|
| Today | `/` | Quick-add form, "Start here" (top 3 focus cards, first emphasised, each with "Why is this here?"), "Also today", heavy-load notice with "Move it", collapsed "Later" list, collapsed "Done today" list, empty and all-done states. |
| Week | `/week` | Seven day buttons with load bar and text label, selected day's task list, "Unscheduled" list, empty state. No add form. |
| Brain dump | `/dump` | Textarea, "Sort it out" button, parsing state, editable draft cards, save, saved confirmation, error and zero-result states. |
| Not found | any other | Friendly 404. |

Present on every page: header with name and tagline, nav (Today, Week, Brain dump), About dialog button, language switcher, connection banner (appears when the backend is unreachable, with retry), floating chat button opening the slide-over chat panel, and the action toast with Undo.

Per-task controls (`TaskItem`): done checkbox, Delete (with inline confirmation), "Change plans" menu (Tomorrow, Pick another day, Later, Make it smaller), Bring back (on deferred tasks). Nothing is shown on done tasks except the checkbox and Delete.

---

## 6. Backend feature to UI coverage

"Covered" means a user can reach it today.

| Backend capability | UI today | Status |
|---|---|---|
| Create workspace, restore on reload | Automatic on first load | Covered (no UI needed) |
| Create task (title, due date, estimate, impact) | Quick-add form on Today only | Covered |
| Create task from a Week day (date pre-filled) | None | **Missing** |
| `description` | None | **Missing** (no field to write or read) |
| Edit title | "Make it smaller" only | Partial |
| Edit due date | "Tomorrow" and "Pick another day" | Covered |
| Edit estimate | "Make it smaller" only | Partial |
| Edit `impact_score` after creation | None | **Missing** |
| Set `impact_score` on brain-dump drafts | None (hard-coded to 3) | **Missing** |
| Clear a due date (set to "no date") | None | **Missing** (API supports null) |
| Mark done and undone | Checkbox, with celebrate toast and Undo | Covered |
| `in_progress` status | None | **Missing** (decide whether to keep or drop it) |
| Defer to Later, bring back | Menu item, collapsed Later list on Today | Covered |
| Delete with confirmation and Undo | Covered | Covered |
| Today's top 3 and rest | Today page | Covered |
| Show why a task is ranked | Chat via "Why is this here?" (top 3 cards only) | Partial. `reasons` and `priority_label` are returned but never displayed inline. |
| Heavy-load notice and delay suggestion | Notice with "Move it" | Partial. The `delay_suggestion.reason` (past its date vs lowest priority) is ignored, and `total_minutes` vs `capacity_minutes` is not shown. |
| Week load per day | Day buttons with load bar and label | Covered |
| Tasks due after the 7-day window | None | **Missing, see section 7** |
| Completed tasks older than today | None | **Missing** |
| Browse all tasks, search, filter by status | None | **Missing** (`GET /tasks?status=` is only used to fill Later and Done today) |
| Brain dump parse, review, edit, remove, save | Brain dump page | Covered |
| Draft `needs_confirmation` and `note` | Highlighted card with note | Covered |
| Chat with suggested questions, task-specific question | Slide-over panel | Covered. Chat is reachable from the top 3 cards only for task-specific questions. |
| AI error handling | Brain dump: separate messages for "no tasks" and "unavailable". Chat: one generic message with retry. | Covered |
| User-set daily capacity (OPT6) | None | Deferred. Capacity is fixed at 240 minutes and shown only as "x / 240 min" in the week bars. |
| Workspace name | None | Unused field |
| Motivational messages (OPT7/OPT8), attachments (OPT1), projects (OPT2), AI "make it smaller" (OPT3), time blocks (OPT4) | None | Not built, optional |
| `source_type` (manual vs AI), `ai_summary` | None | Unused in UI; `ai_summary` is never written |

---

## 7. Gaps worth fixing first

1. **Some tasks can be invisible.** A task due more than 7 days out that is not in the top 3 appears on no page: not in Today's "Also today" (only due-today, past, or undated), not in Week (7 days only), not in Later or Done. It still exists and the chat can see it. This is the largest gap. It needs an "Upcoming" or "All tasks" view, or a "Later this month" section.
2. **No way to see or find completed work** beyond "Done today".
3. **Editing is thin.** Impact, description, and clearing a date cannot be changed after creation, and the only way to retitle a task is "Make it smaller". A single "Edit task" form would cover all of these.
4. **Ranking is opaque on screen.** The backend already returns `priority_label` (`focus`/`soon`/`whenever`) and plain reasons, but only the chat explains them. A small inline label or "why" line on cards would use data that is already there.
5. **Week is read-only for creation.** There is no add button on a day.
6. **Heavy-load notice is vague.** It could show the minutes (`total_minutes` of `capacity_minutes`) and use `delay_suggestion.reason` to word the suggestion.
7. **`in_progress` has no UI.** Either add a "Start" action or remove the status.

If a design change needs a new backend field or endpoint (for example an "all tasks" list with date range, a settings endpoint for capacity, or a stored workspace name), list it and it can be added as its own checkpoint.
