# Implementation Roadmap — AI Schedule Organizer

This roadmap turns `system-design.md` into small checkpoints that can each be reviewed, tested, and committed on their own. It follows the product vision: a calm, friendly scheduler that helps overwhelmed people see one clear next step. It is not meant to push people to do more.

## 1. Current repository state

| Item | Finding |
|---|---|
| Files | `README.md` (one line), `system-design.md`. No application code exists yet. |
| Git | Branch `main`, clean, tracking `origin/main`. Running git from WSL fails with "dubious ownership" because the repo sits on an NTFS/OneDrive mount. You can fix it with `git config --global --add safe.directory <repo-path>`. That changes your git config, so the choice is yours. |
| Python (WSL) | 3.14.4. This version is very new, and some pinned dependencies may not ship wheels for it yet. See assumption A9. |
| Node | Only the Windows `node.exe` (v24.14.0) is installed. WSL has no `node`. |
| Docker | Docker Desktop CLI is available. |
| Location | `/mnt/c/.../OneDrive/...`. Running `node_modules` and `.venv` on a OneDrive-synced NTFS mount is slow, and sync can lock files. See assumption A10. |

Nothing exists to preserve except the two documents. Everything below is additive.

## 2. Decisions on conflicts with `system-design.md`

Status after your review. Approved items are final unless you reopen them.

| # | Topic | Decision | Status |
|---|---|---|---|
| C1 | Emotional support scope | The product is a task scheduler only. The chatbot answers "what's next?" and gives schedule/task suggestions. There is no therapy mode, no mood tracking, and no emotional-support conversation. The friendly tone comes from copy, illustrations, and flexible planning. Short AI motivational messages are deferred (C9). | Resolved by you |
| C2 | Sensitivity of user text | Not applicable. Users are assumed to enter tasks only, so the design's hosted-LLM choice stands. The crisis-keyword path and the "professional care" notice I proposed are **removed**. A short privacy line stays in the About dialog: text you type is sent to an AI provider. If you want any "not professional care" wording back, it is a copy-only change. | Resolved by you |
| C3 | "Skip" action | Postpone and reschedule change `due_date`. Skip sets `deferred` and moves the task to a "Later" list. Simplify edits the title or estimate. No schema change. | Approved |
| C4 | Stored vs. computed scores | Scores are computed fresh on every read and also written back after task mutations. | Approved |
| C5 | Workload warning tone | The design's "one warning if workload is unrealistic" is kept as a calm "heavy load" notice that always includes a concrete suggestion for what to move. Same logic, kinder wording. | Delegated to me, applied |
| C6 | Schedule endpoints | The design lists both `POST /schedule/generate` and `GET /tasks/today`/`/week`. I build only the two GET endpoints, because the schedule is computed deterministically on each read and a separate "generate" step would add state to keep in sync. | Delegated to me, applied |
| C7 | Batch save of AI drafts | Add `POST /tasks/bulk`, a single transaction with `source_type=ai_parsed`. | Approved |
| C8 | Anonymous workspace | `POST /workspaces`. The id is stored in `localStorage` and sent as `X-Workspace-Id`. Anyone holding the id can access that workspace. This is acceptable for the demo. | Approved |
| C9 | Motivational messages and per-user capacity | Both go beyond the design (extra LLM use; a new `workspaces.daily_capacity_minutes` column). You decided to **defer both until everything else is finished**. They are now OPT6 to OPT8 and are not part of the core. Until then, daily capacity is a fixed constant of 240 minutes. | Deferred by you |

## 3. Question answers

| # | Your answer | How the roadmap applies it |
|---|---|---|
| Q1 | Use the user's local date. | The frontend sends `today=YYYY-MM-DD` from the browser. The backend never guesses a timezone. |
| Q2 | The product is a task scheduler, not a coping tool. | No crisis or care content. See C2. |
| Q3 | Crisis keyword detection was acceptable. | Moot: the whole crisis path is removed under Q2. |
| Q4 | English and Indonesian, changeable. | New checkpoint CP3b adds a small dictionary-based i18n layer (`en`, `id`) and a language switcher. Every later checkpoint puts its strings in the dictionaries instead of hard-coding them. LLM endpoints receive a `locale` and answer in that language. More languages need one new dictionary file. |
| Q5 | List the needed illustrations and generate placeholders. | See §4. Twelve placeholder SVGs are already in `assets/illustrations/`. |
| Q6 | Local first, then Supabase on deploy. | Docker Compose Postgres for development. Supabase Postgres in CP19, switched only through `DATABASE_URL`. |
| Q7 | Users can set their own daily capacity. | You later deferred this with C9. For now capacity is the constant 240 minutes (A14). The user-configurable version is OPT6. |

No essential questions remain open. The next section lists small items where I picked a default.

## 4. Illustration inventory (Q5)

The art style matches across all placeholders: a warm cream blob, a navy outline `#2B3A55`, pastel accents, and a friendly orca mascot (a nod to the project name ORCA). All are SVG files with `viewBox` 240×180 (the celebrate burst is 120×120), each with a `<title>`. They are **placeholders** and can be swapped for final art by replacing the file, keeping the same filename. I rendered them in Chrome and they look correct. Files are in `assets/illustrations/`, and CP16 copies them to `frontend/public/illustrations/`.

| File | Used for | Screen / state | Needed by |
|---|---|---|---|
| `welcome.svg` | Orca waving | First visit and the "About" dialog header | CP16 |
| `empty-tasks.svg` | Empty clipboard with a sprout | No tasks yet (empty state) | CP6 / CP16 |
| `day-clear.svg` | Orca floating calmly under the sun | Nothing planned today | CP10 / CP16 |
| `all-done.svg` | Orca leaping with a check mark | Everything for today is done (success) | CP10 / CP16 |
| `celebrate.svg` | Check mark burst (120×120) | One task completed, micro-interaction | CP17 |
| `heavy-load.svg` | Stack of boxes with one moved aside | Heavy-load notice, paired with the delay suggestion | CP10 / CP16 |
| `week-empty.svg` | Open week calendar | Week view with no tasks | CP11 / CP16 |
| `brain-dump.svg` | Scribble becomes a list | Brain dump page header and empty state | CP13 / CP16 |
| `untangling.svg` | Yarn ball unwinding | Brain dump parsing in progress (loading) | CP13 / CP16 |
| `chat-helper.svg` | Orca with a speech bubble | Chat panel empty state | CP15 / CP16 |
| `connection-error.svg` | Sleepy cloud, unplugged cable | Cannot reach the server (error) | CP3 / CP16 |
| `oops.svg` | Paper plane on a cloud | Generic error / not found | CP16 |

Until CP16, earlier checkpoints use simple text-only empty and error states. CP16 swaps in the illustrations, so no earlier checkpoint depends on the artwork.

## 5. Assumptions for non-critical details

- A1 Monorepo layout: `backend/` (FastAPI) and `frontend/` (Next.js App Router).
- A2 Backend packaging: `requirements.txt` and `requirements-dev.txt` with pinned versions in a venv. No extra tooling.
- A3 LLM access: call OpenRouter's OpenAI-compatible HTTP API directly with `httpx`, with no vendor SDK. Provider and model are pinned through env vars (`LLM_MODEL`, default a Qwen3-14B-class model).
- A4 Frontend data fetching: a small typed `fetch` wrapper. No React Query or state library.
- A5 Frontend tests: Vitest and React Testing Library. Lint with `next lint` (includes `jsx-a11y` rules).
- A6 Motion: Tailwind and CSS transitions only, no animation library. Always respect `prefers-reduced-motion`.
- A7 Impact input is shown as 3 friendly choices ("Small deal / Matters / Really matters") stored as `impact_score` 1/3/5. The default of 3 matches the design.
- A8 Tasks without an estimate count as 30 minutes for load calculations only. The stored value stays null.
- A9 Python: 3.12 (3.12.13 on Windows, installed with `uv`). Dependencies are pinned to the exact versions that passed each checkpoint.
- A10 Development runs in Windows PowerShell only (switched from WSL after CP1). The virtual environment is `backend\.venv`. Database URLs use `127.0.0.1` instead of `localhost`, because `localhost` resolves to IPv6 first on Windows and stalls connections to the Docker Postgres.
- A11 Users can delete a task (after a confirmation step) in core. An undo toast is added in polish.
- A12 i18n has no library. It is a typed dictionary (`en` is the source of truth, and a test fails if `id` is missing a key), a `LocaleProvider`, and `Intl` for date formatting. The default language comes from `navigator.language` (`id*` → Indonesian, otherwise English), and the choice is saved in `localStorage`. Revisit with `next-intl` only if routing by locale becomes necessary.
- A13 Motivational messages (deferred, OPT7/OPT8): at most one LLM-generated message per workspace, per day, per locale. The result is cached in memory on the server, with no new table. Fixed local fallbacks (written in both languages) are used when the LLM is unavailable. The message appears on the Today screen as a small dismissible card. Never in a blocking dialog.
- A14 Daily capacity is a backend constant of 240 minutes (`DAILY_CAPACITY_MINUTES` in config) until OPT6. When OPT6 is built, the range will be 30–720 in steps of 15.

## 6. Principles applied to every checkpoint

- The LLM never decides priorities. Priority logic lives in deterministic Python with unit tests.
- Every LLM output passes Pydantic validation, and tests never call a real LLM (a fake client is injected).
- Every async UI surface has loading, error, empty, and success states. Error copy is calm, tells the user what still works, and offers a retry.
- Copy never shames: no "overdue!", no streak counters, no "you failed". Example: "This one's past its date. Want to pick a new day?"
- All user-facing strings live in the `en` and `id` dictionaries from CP3b onward. Never hard-code strings in components.
- Accessibility basics from day one: semantic HTML, labelled inputs, visible focus, `aria-live` for async results, and WCAG AA contrast.
- A checkpoint is done only when all of its verification commands pass.

## 7. Standard verification commands

Commands are defined in CP1 and CP3 (plus the CP3b dictionary test) and reused afterwards.

```bash
# Backend (from backend/)
ruff check . && ruff format --check .
pytest -q

# Frontend (from frontend/)
npm run lint
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build
```

## 8. Checkpoint report template

After each implemented checkpoint, I will report in this format. I will never commit or push.

```text
Checkpoint: CPx — <name>
Implementation summary: <what changed and why>
Verification results: <commands run + pass/fail output>
Known limitations: <what's deferred or unverified>
Suggested commit message: <exact message>
Reminder: review `git diff` (and `git status` for new files) before committing.
```

---

## Phase A — Foundation

### CP0 — Repository scaffolding
- Goal / value: a predictable layout so later diffs stay small and focused.
- Scope: root `.gitignore` (Python, Node, `.env*`, `.venv`, `node_modules`, `.next`), `.editorconfig`, README "Project layout" and "Local setup" stubs, empty `backend/` and `frontend/` folders with placeholder READMEs.
- Excluded: any application code or dependencies.
- Files: `.gitignore`, `.editorconfig`, `README.md`, `backend/README.md`, `frontend/README.md`.
- Depends on: none.
- Acceptance: `git status` shows only these files. `.env` files are ignored (verify with `git check-ignore backend/.env`).
- Verify: `git check-ignore -v backend/.env frontend/.env.local`.
- Commit: `chore: add repo layout, gitignore and editorconfig`

### CP1 — Backend skeleton with health check
- Goal / value: a running FastAPI app and test harness that everything else builds on.
- Scope: `app/main.py` with `GET /health` → `{"status":"ok"}`, `app/config.py` (pydantic-settings: `DATABASE_URL`, `CORS_ORIGINS`, `LLM_*` placeholders), pinned requirements, `pytest` and `ruff` config, `.env.example`.
- Excluded: database, CORS middleware wiring (CP3), LLM code.
- Files: `backend/app/{__init__,main,config}.py`, `backend/requirements*.txt`, `backend/pyproject.toml` (tool config only), `backend/.env.example`, `backend/tests/test_health.py`.
- Depends on: CP0.
- Acceptance: `uvicorn app.main:app` serves `/health`. The test passes. Ruff is clean.
- Verify: `pytest -q`, `ruff check .`, `curl -s localhost:8000/health`.
- Commit: `feat(backend): add FastAPI skeleton with health endpoint`

### CP2 — Database models and first migration
- Goal / value: persistent storage for workspaces and tasks that matches the design ERD.
- Scope: SQLAlchemy 2.x models `Workspace` (exactly as in the design) and `Task` (all columns and enums from the design), session dependency, Alembic init plus the initial migration, `docker-compose.yml` with Postgres 16 only, and a pytest fixture that runs against a test database with per-test transaction rollback.
- Excluded: `projects` and `attachments` tables (optional, see OPT1/OPT2), endpoints.
- Files: `backend/app/db.py`, `backend/app/models.py`, `backend/alembic.ini`, `backend/migrations/**`, `docker-compose.yml`, `backend/tests/conftest.py`, `backend/tests/test_models.py`.
- Depends on: CP1.
- Acceptance: `alembic upgrade head` and `alembic downgrade base` both succeed on an empty database. A model round-trip test passes. Status and source enums reject invalid values.
- Verify: `docker compose up -d db`, `alembic upgrade head`, `alembic downgrade base && alembic upgrade head`, `pytest -q`.
- Commit: `feat(backend): add workspace and task models with initial migration`

### CP3 — Frontend skeleton and design tokens
- Goal / value: a calm, branded app shell that can reach the backend.
- Scope: Next.js (App Router, TypeScript) with Tailwind and shadcn/ui init. Warm color tokens, typography, radius, and spacing in the Tailwind config. App shell with header, main area, and skip-to-content link. `lib/api.ts` typed fetch wrapper with timeout and error normalization. Vitest and RTL setup. Backend `CORSMiddleware` driven by `CORS_ORIGINS`. A small "connecting…" / "can't reach the server" banner using `/health` (text-only until CP16).
- Excluded: feature pages, language switching (CP3b).
- Files: `frontend/**` scaffold, `frontend/lib/api.ts`, `frontend/components/AppShell.tsx`, `frontend/components/ConnectionBanner.tsx` (+ test), `backend/app/main.py` (CORS), `backend/tests/test_cors.py`.
- Depends on: CP1.
- Acceptance: the page renders with the shell. When the backend is down, a friendly banner with a retry button appears. When it is up, the banner disappears. Lighthouse accessibility score ≥ 95 on the shell.
- Verify: frontend standard commands, backend `pytest -q`, manual run of both servers.
- Commit: `feat(frontend): scaffold Next.js app shell with design tokens and API client`

### CP3b — English / Indonesian language support
- Goal / value: the whole app can be used in English or Indonesian, and a third language only needs a new dictionary file (Q4, A12).
- Scope: `frontend/lib/i18n/{en,id}.ts` typed dictionaries (`en` is the source of truth), a `LocaleProvider` and `useT()` hook, a language switcher (accessible select or toggle) in the header, default from `navigator.language`, choice saved in `localStorage`, `<html lang>` updated, and locale-aware date formatting with `Intl`. Move the CP3 shell and banner strings into the dictionaries.
- Excluded: locale-based routes, a translation library, and backend translations. The backend receives `locale` only in the AI endpoints (CP12 and CP14).
- Files: `frontend/lib/i18n/**`, `frontend/components/LanguageSwitcher.tsx` (+ test), `AppShell.tsx`, `ConnectionBanner.tsx`.
- Depends on: CP3.
- Acceptance: switching language changes all visible text immediately and persists after reload. A test fails if `id` lacks any key present in `en`. `lang` on `<html>` matches the active language.
- Verify: frontend standard commands.
- Commit: `feat(frontend): add English and Indonesian language support`

### CP4 — Anonymous workspace
- Goal / value: users get their own space without signing up, which keeps the barrier to entry low.
- Scope: `POST /workspaces`, `GET /workspaces/{id}`,  a `get_workspace` dependency reading `X-Workspace-Id` (404 if unknown, 422 if malformed). Frontend `useWorkspace` creates the workspace on first visit, stores it in `localStorage`, and recovers if the stored id no longer exists.
- Excluded: login and RLS (nice-to-have per design).
- Files: `backend/app/routers/workspaces.py`, `backend/app/schemas.py`, `backend/app/deps.py`, `backend/tests/test_workspaces.py`, `frontend/lib/workspace.ts` (+ test).
- Depends on: CP2, CP3b.
- Acceptance: First load creates exactly one workspace and a reload reuses it. A stale id triggers recreation. States: loading skeleton, and an error message with retry.
- Verify: standard commands, plus a manual check of DevTools → Application → localStorage.
- Known limitation to report: possession of the workspace UUID equals access (C8).
- Commit: `feat: add anonymous workspace creation and bootstrap`

## Phase B — Core end-to-end experience (no AI yet)

### CP5 — Task CRUD API
- Goal / value: reliable task storage scoped to the workspace.
- Scope: `POST /tasks`, `GET /tasks?status=`, `GET /tasks/{id}`, `PATCH /tasks/{id}`, `DELETE /tasks/{id}`. Validation: title 1–200 characters and trimmed, `estimated_minutes` 5–720, `impact_score` 1–5. `completed_at` is set and cleared automatically when status moves to or from `done`. `updated_at` is maintained.
- Excluded: scoring (CP7), bulk create (CP12).
- Files: `backend/app/routers/tasks.py`, `backend/app/schemas.py`, `backend/tests/test_tasks_crud.py`.
- Depends on: CP4.
- Acceptance: all endpoints work. A task from workspace A returns 404 when requested with workspace B's id (isolation test). Invalid input returns 422 with field errors.
- Verify: `pytest -q`, `ruff check .`.
- Commit: `feat(backend): add workspace-scoped task CRUD endpoints`

### CP6 — Manual task entry and task list UI
- Goal / value: the first complete user flow. The user adds a task and sees it.
- Scope: a quick-add form where only the title is required and "More details" reveals the due date, estimate, and the 3-choice impact (A7). Below it, a simple list of tasks. Mark done or undone. Delete with a confirmation step.
- Excluded: priority ordering (CP9), postpone, skip, and simplify (CP8).
- Files: `frontend/app/page.tsx`, `frontend/components/tasks/{QuickAddForm,TaskList,TaskItem}.tsx` (+ tests), `frontend/lib/tasks.ts`.
- Depends on: CP5.
- Acceptance: states covered. Empty: friendly message such as "Nothing here yet — add one small thing." Loading: skeleton. Error: inline message that keeps the typed input. Success: the new task appears and focus returns to the input. Usable by keyboard only.
- Verify: frontend standard commands and a manual end-to-end check.
- Commit: `feat(frontend): add quick task entry and task list`

### CP7 — Deterministic priority engine
- Goal / value: consistent, explainable ordering that the AI cannot override.
- Scope: a pure module `app/services/priority.py`.
  - `urgency(due_date, today)`: no date = 1, ≥8 days = 1, 4–7 days = 2, 2–3 days = 3, tomorrow = 4, today or past = 5.
  - `effort_penalty(minutes)`: >120 minutes = 1, else 0.
  - `priority_score = urgency + impact - effort_penalty`, where impact is mapped to a 1–5 scale.
  - `priority_label`: `focus` / `soon` / `whenever`, a gentle wording choice.
  - Deterministic tie-break: due date, then `created_at`, then id.
  - Each result includes `reasons: list[str]` (e.g. "due tomorrow", "you marked it as really mattering") for later explanations.
  - Scores are written back after task mutations (C4).
- Excluded: endpoints and day grouping (CP8).
- Files: `backend/app/services/priority.py`, `backend/tests/test_priority.py`, `backend/app/routers/tasks.py` (write-back hook).
- Depends on: CP5.
- Acceptance: table-driven tests for every urgency boundary, the effort penalty, ties, and same input → same output. No LLM imports in the module.
- Verify: `pytest -q tests/test_priority.py`.
- Commit: `feat(backend): add deterministic priority scoring engine`

### CP8 — Flexible task actions (postpone, skip, simplify)
- Goal / value: users can change plans without guilt. This is a core emotional-safety promise.
- Scope:
  - Backend: verify that PATCH supports these transitions and add tests. No new endpoints unless needed.
  - Frontend action menu per task:
    - "Move to tomorrow"
    - "Pick another day" (accessible date picker)
    - "Not today → Later" (sets `deferred`, C3)
    - "Bring back"
    - "Make it smaller" (inline edit of title and estimate)
  - Every action shows a short, kind confirmation ("Moved to tomorrow. Plans change — that's fine.").
- Excluded: AI-assisted breakdown (OPT3), undo toasts (CP17).
- Files: `frontend/components/tasks/TaskActions.tsx` (+ test), `frontend/components/tasks/LaterList.tsx`, `backend/tests/test_task_actions.py`.
- Depends on: CP6, CP7.
- Acceptance: each action persists, updates the list without a full reload, and is reachable by keyboard. Deferred tasks are excluded from scoring and shown in a collapsible "Later" list. Error states roll back optimistic UI changes.
- Verify: standard commands.
- Commit: `feat: add postpone, skip-to-later and simplify task actions`

### CP9 — Today and week schedule API
- Goal / value: one backend call answers "what now?" and "how heavy is my week?".
- Scope: `app/services/schedule.py` and two endpoints.
  - `GET /tasks/today?today=YYYY-MM-DD` → `{top: [≤3 tasks with reasons], rest: [...], heavy_load: {is_heavy, message} | null, delay_suggestion: {task_id, reason} | null}`.
  - `GET /tasks/week?today=` → 7 day buckets with `total_minutes`, `task_count`, `is_heavy`, plus an "unscheduled" bucket.
  - Heavy rule: daily minutes > the capacity constant (240, A14) or more than 2 tasks over 120 minutes on one day. The delay suggestion picks the lowest-scoring non-due-today task.
  - A missing `today` parameter defaults to the server date, with a documented caveat.
- Excluded: time blocks (OPT4).
- Files: `backend/app/services/schedule.py`, `backend/app/routers/tasks.py`, `backend/tests/test_schedule.py`.
- Depends on: CP7.
- Acceptance: tests cover the empty workspace, a light day, a heavy day, overdue tasks, deferred tasks excluded, done tasks excluded, and stable output.
- Verify: `pytest -q`.
- Commit: `feat(backend): add today and week schedule endpoints`

### CP10 — Today dashboard UI and About dialog
- Goal / value: the home screen shows the next step clearly, and users know how their text is used.
- Scope:
  - The "Today" view replaces the flat list as the default. It shows the top 3 as "Start here" cards (first one emphasised), "Also today", the heavy-load notice paired with its delay suggestion and a one-tap "Move it" button, and the Later list.
  - A short "About this app" dialog with a single factual privacy point: AI features send the text you type to a third-party AI provider, so avoid entering sensitive personal details. No mental-health or care wording (C2).
- Excluded: week view (CP11), illustrations (CP16).
- Files: `frontend/app/page.tsx`, `frontend/components/today/{TodayView,FocusCard,HeavyLoadNotice}.tsx` (+ tests), `frontend/components/AboutDialog.tsx`. All strings are in the `en`/`id` dictionaries.
- Depends on: CP8, CP9, CP3b.
- Acceptance:
  - Empty: "Your day is clear" with an add prompt.
  - All done: a warm success message with no "add more" pressure.
  - Loading and error states present.
  - Marking a task done refreshes the top 3.
  - The About dialog is reachable from every page.
- Verify: standard commands, and a manual pass at 375px and 1280px widths.
- Commit: `feat(frontend): add today dashboard with gentle load notice and about dialog`

### CP11 — Week load view
- Goal / value: users see at a glance whether the week is manageable and where there's room.
- Scope:
  - A "Week" tab showing 7 day columns (stacked rows on mobile) with load bars relative to capacity, and a soft highlight on heavy days.
  - Clicking a day lists its tasks with the CP8 actions.
  - An "Unscheduled" section.
  - Bars include text equivalents for screen readers.
- Excluded: drag-and-drop rescheduling, calendar sync.
- Files: `frontend/app/week/page.tsx`, `frontend/components/week/{WeekView,DayColumn,LoadBar}.tsx` (+ tests), nav update in `AppShell.tsx`.
- Depends on: CP9, CP10.
- Acceptance: states covered (empty week, loading, error). Load is never shown with alarming color alone. Text labels like "Full day" or "Room to breathe" are always present.
- Verify: standard commands.
- Commit: `feat(frontend): add weekly load view`

Milestone: after CP11, the full non-AI core works end to end. Users can add, prioritise, view today and the week, and postpone, skip, or simplify tasks.

## Phase C — AI features (built on the working core)

### CP12 — Brain dump parsing API
- Goal / value: turn messy text into task drafts without forcing users to structure their thoughts.
- Scope:
  - LLM client: `app/services/llm.py`. A thin `httpx` client for OpenRouter with a pinned model, `response_format: json_schema`, a timeout, one retry on transport errors, and typed errors.
  - `POST /tasks/parse` takes `{text ≤ 5000 chars, today, locale}` and returns `{drafts: [{title, due_date?, estimated_minutes?, needs_confirmation, note?}]}`. Output is validated with Pydantic. Invalid or empty output becomes a friendly 502 or 422. Nothing is saved.
  - `POST /tasks/bulk` saves approved drafts transactionally (C7).
  - The API key is read from env only, and the key and raw user text are never logged.
- Excluded: file extraction (OPT1).
- Files: `backend/app/services/llm.py`, `backend/app/services/parse.py`, `backend/app/routers/tasks.py`, `backend/tests/test_parse.py` (fake LLM via dependency override), `backend/.env.example`.
- Depends on: CP5.
- Acceptance: tests cover valid output, malformed JSON, a schema violation, a timeout, an empty result, relative date resolution (prompt includes `today`), and bulk rollback on one invalid item. A manual smoke test with a real key succeeds.
- Verify: `pytest -q`, then a manual `curl -X POST localhost:8000/tasks/parse ...`.
- Commit: `feat(backend): add LLM brain-dump parsing and bulk task save`

### CP13 — Brain dump UI with draft review
- Goal / value: "Just dump it here" lowers the effort of getting started, and the user stays in control.
- Scope:
  - A large, calm textarea with a placeholder example.
  - "Sort it out for me" button.
  - Loading state with gentle copy ("Untangling…").
  - Draft review cards that can be edited or removed. `needs_confirmation` fields are highlighted ("Is Friday right?").
  - "Save these" leads to a success state and a link to Today.
  - If the AI fails, the typed text is kept and the user is offered "add them manually instead".
- Excluded: autosave of drafts.
- Files: `frontend/app/dump/page.tsx`, `frontend/components/dump/{BrainDumpInput,DraftReview,DraftCard}.tsx` (+ tests).
- Depends on: CP12, CP10, CP3b.
- Acceptance: the request sends the active `locale`. All states covered (empty input disables submit, loading, error, zero drafts, success). Text is never lost on error. Keyboard and screen-reader friendly (`aria-live` on result).
- Verify: standard commands, plus a manual run with a real key.
- Commit: `feat(frontend): add brain dump input with draft review`

### CP14 — Schedule chat API
- Goal / value: users can ask "what first?" in plain words and get answers grounded in their real schedule.
- Scope:
  - `POST /chat/query` takes `{question ≤ 500 chars, today, locale, task_id?}`.
  - Context builder: when `task_id` is given, include that task's details and `reasons`. Otherwise include the today and week summaries from CP9. No keyword intent classifier.
  - Scope of answers (C1): what is next, what can wait, what fits in a given amount of time, and why a task is ranked where it is. The model gives suggestions only, and the backend's ranking is never changed.
  - The system prompt has the model:
    - answer only from the provided schedule
    - never change priorities
    - stay friendly and brief, and reply in `locale`
    - politely say it can only help with the schedule when asked something else
  - No conversation history is stored.
- Excluded: streaming, memory, multi-turn persistence.
- Files: `backend/app/services/chat.py`, `backend/app/routers/chat.py`, `backend/tests/test_chat.py`.
- Depends on: CP9, CP12 (LLM client).
- Acceptance: tests assert that context contains only the workspace's own data, that off-topic questions get the redirect instruction in the prompt, and that LLM errors map to friendly responses. Prompts live in one file for review.
- Verify: `pytest -q`, manual smoke test.
- Commit: `feat(backend): add schedule-grounded chat endpoint`

### CP15 — Chat UI
- Goal / value: a low-effort way to get unstuck.
- Scope:
  - A slide-over chat panel with suggested question chips from the design ("What should I do first?", "I only have 2 hours", "What can wait?").
  - A "Why is this here?" link on focus cards that opens chat with `task_id`.
  - Session-only message list.
  - States: typing indicator, error with retry, and an empty state that shows the chips.
  - A short persistent caption: "Answers are based on your schedule." (in both languages)
- Excluded: saved history.
- Files: `frontend/components/chat/{ChatPanel,SuggestedQuestions,ChatMessage}.tsx` (+ tests), `FocusCard.tsx`.
- Depends on: CP14, CP10.
- Acceptance: the panel works on mobile and with the keyboard (focus trap, Esc closes). New answers are announced through `aria-live`.
- Verify: standard commands, manual smoke test.
- Commit: `feat(frontend): add schedule chat panel`

## Phase D — UI polish

### CP16 — Illustrations and microcopy pass
- Goal / value: the app feels friendly and human, not clinical.
- Scope:
  - Copy the 12 placeholder SVGs from `assets/illustrations/` into `frontend/public/illustrations/` and place them according to the inventory in §4. Use `alt=""` for decorative images and a translated `alt` where the image carries meaning.
  - Review all `en` and `id` dictionary entries against the tone rules in §6 (and have a native Indonesian speaker, i.e. you, check the Indonesian text).
  - Responsive spacing review.
- Excluded: new features and final artwork (placeholders can be swapped later without code changes).
- Files: `frontend/public/illustrations/*.svg`, `frontend/components/illustrations/Illustration.tsx` (a small wrapper that takes a name), `frontend/lib/i18n/*.ts`, existing view components.
- Depends on: CP15.
- Acceptance: every state in the §4 table shows its illustration. No hard-coded user-facing strings remain (a grep check for obvious literals in `components/`). Both languages are complete.
- Verify: standard commands, plus a visual check at 375, 768, and 1280px in both languages.
- Commit: `style(frontend): add illustrations and unify friendly microcopy`

### CP17 — Micro-interactions and encouraging feedback
- Goal / value: small moments of delight and reassurance.
- Scope:
  - A CSS completion animation (soft check plus a short encouraging line chosen from a small set).
  - Toast system with undo for done, skip, postpone, and delete. Implemented with the shadcn toast component, so no new animation library.
  - Hover and press transitions.
  - Everything is disabled under `prefers-reduced-motion`.
- Excluded: streaks, points, or leaderboards. These add pressure and conflict with the vision.
- Files: `frontend/components/ui/toast*`, `frontend/components/feedback/*`, `TaskActions.tsx`, `TaskItem.tsx`.
- Depends on: CP16.
- Acceptance: undo restores the previous state on the server. Reduced-motion is verified via DevTools emulation.
- Verify: standard commands.
- Commit: `feat(frontend): add completion feedback and undo toasts`

### CP18 — Accessibility and responsiveness audit
- Goal / value: usable by everyone, including people who are tired or distracted.
- Scope:
  - Keyboard-only walkthrough of every flow, focus order, and visible focus.
  - Color contrast AA and touch targets ≥ 44px.
  - Screen reader labels, and announcement of form errors.
  - Fix the issues found.
- Excluded: new features.
- Files: as found.
- Depends on: CP17.
- Acceptance: Lighthouse accessibility ≥ 95 on Today, Week, and Dump. `next lint` passes with no a11y warnings. A checklist of results is recorded in the PR or commit body.
- Verify: standard commands, Lighthouse in Chrome DevTools.
- Commit: `fix(frontend): resolve accessibility and responsive layout issues`

## Phase E — Release readiness

### CP19 — Deployment configuration
- Goal / value: a working demo hosted on Vercel and Railway/Render, as the design specifies.
- Scope:
  - Backend start command and `Procfile` or equivalent.
  - Migrations run on deploy.
  - Switch `DATABASE_URL` to the Supabase Postgres connection string (use the pooled connection with SSL), run Alembic against it, and keep local Docker Postgres as the default for development (Q6).
  - Production `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`, and the pinned `LLM_MODEL`.
  - README deploy section, plus a post-deploy smoke checklist.
- Excluded: CI/CD pipelines, monitoring, IaC.
- Files: `backend/Procfile` (or `railway.json`), `README.md`, `.env.example` files.
- Depends on: CP15 (CP18 recommended).
- Acceptance: the deployed frontend completes the core flow against the deployed backend. No secrets end up in the repo or frontend bundle (`grep` the build output for the key prefix).
- Verify: the smoke checklist, and `npm run build && grep -r "sk-or-" .next || echo clean`.
- Note: deploying touches shared infrastructure, so I will ask before running any deploy command.
- Commit: `chore: add deployment configuration and docs`

## Phase F — Optional enhancements (only after the core, each needs your go-ahead)

| ID | Enhancement | Justification | Depends on | Commit |
|---|---|---|---|---|
| OPT1 | Attachments and file text extraction (`POST /tasks/{id}/attachments`, plain text and PDF) | Listed as optional in the design. Adds storage and an extraction dependency. | CP12 | `feat: add task attachments with text extraction` |
| OPT2 | Projects grouping (table, CRUD, filter chip) | Optional in the design ERD. | CP5 | `feat: add optional project grouping for tasks` |
| OPT3 | AI "Make it smaller": suggest 1–3 smaller first steps as drafts for approval | Directly supports "simplify" (vision). Uses the parse pipeline, and AI only proposes. Slightly extends the design's AI scope, so it needs sign-off. | CP12, CP8 | `feat: add AI-suggested smaller first steps` |
| OPT4 | Morning / afternoon / evening time blocks in Today | Mentioned as optional in the design. | CP10 | `feat: add simple time blocks to today view` |
| OPT5 | Playwright smoke E2E for the core flow | Adds confidence before demos. Extra dev dependency. | CP11 | `test: add end-to-end smoke test for core flow` |
| OPT6 | User-configurable daily capacity: `workspaces.daily_capacity_minutes` (default 240, range 30–720, step 15), `PATCH /workspaces/{id}`, a Settings dialog, and the schedule service reading the stored value | You asked for it (Q7), but deferred it (C9). Adds one column beyond the design ERD. | CP11 | `feat: let users set their daily capacity` |
| OPT7 | Motivational message API: `GET /motivation?today=&locale=`. One or two warm sentences, generated from counts only (no task titles), validated (≤160 characters), cached once per workspace per day, with fixed English and Indonesian fallbacks when the LLM fails or returns something invalid. See A13. | You asked for it, but deferred it (C9). It extends the design's AI scope. | CP9, CP12 | `feat(backend): add short motivational message endpoint with fallbacks` |
| OPT8 | Motivational message UI: a dismissible card at the top of Today (dismissal saved per date in `localStorage`), with loading, fallback, and `aria-live="polite"` handling. Never a modal or toast. | Pairs with OPT7. | OPT7, CP10 | `feat(frontend): show a dismissible motivational message on Today` |

Explicitly out of scope, per the design and vision: login/RLS, calendar sync, notifications, recurring tasks, analytics, mood tracking, therapy or emotional-support chat, crisis handling, community features, and streaks or gamified pressure.

## Dependency overview

```text
CP0 → CP1 → CP2 ──────────────┐
       └→ CP3 → CP3b ─────────┴→ CP4 → CP5 → CP6 ─┐
                                        │          ├→ CP8 ─┐
                                        └→ CP7 ────┤       ├→ CP10 → CP11
                                                   └→ CP9 ─┘
CP5 → CP12 → CP13 (also needs CP10)
CP9 + CP12 → CP14 → CP15 → CP16 → CP17 → CP18 → CP19
```

## Git workflow reminders
- I prepare changes and report on each one. You review `git diff` and `git status`, then commit manually. I never commit or push.
- One checkpoint equals one commit. Unrelated checkpoints are never combined.
- Consider a feature branch per checkpoint rather than committing directly to `main`.
