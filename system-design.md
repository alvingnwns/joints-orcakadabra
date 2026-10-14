# Simple System Design for AI Schedule Organizer

## Product goal
This web app helps students or young workers turn a messy workload into a clear and realistic schedule. The AI is used only for objective support such as parsing tasks, extracting structure from notes or files, and explaining schedule decisions. The final prioritization and schedule logic should stay in the backend so the product remains consistent, auditable, and simple.[cite:186][cite:64]

## Product decision
The app will use an LLM API instead of self-hosting a model. This reduces infrastructure complexity, removes GPU setup from the project scope, and is sufficient because the app does not need to process highly sensitive emotional or medical conversations. The backend will call a managed API provider such as OpenRouter or Ollama Cloud, while all scheduling decisions remain in FastAPI.[cite:197][cite:186]

## Core product scope
The MVP should focus on four flows only:
- Add a task manually.
- Paste a brain dump and convert it into task drafts.
- View today's priorities and this week's load.
- Ask the chatbot questions about the current schedule, such as what to do first, what can be delayed, or why a task is important.

The app should not include therapy chat, community features, mood tracking, or open-ended emotional support. That would increase product risk and distract from the actual problem of workload clarity.

## System design and flow

### High-level architecture
```text
Frontend: Next.js
  ├─ Task input
  ├─ Brain dump input
  ├─ Schedule dashboard
  └─ Chat interface
        │
        ▼
Backend: FastAPI
  ├─ Task CRUD service
  ├─ File extraction service
  ├─ LLM API orchestration
  ├─ Priority scoring engine
  └─ Schedule generator
        │
        ├─ PostgreSQL / Supabase
        ├─ Optional object storage
        └─ External LLM API
            ├─ OpenRouter
            └─ or Ollama Cloud
```

### Main flow
1. The user creates tasks manually or pastes a messy brain dump.
2. FastAPI sends unstructured text to the LLM API.
3. The LLM returns structured task drafts in JSON format.
4. FastAPI validates the output against a schema before saving it. OpenRouter supports structured outputs through `response_format` with `json_schema`, which is useful for consistent parsing in applications like this.[cite:186][cite:187]
5. The backend stores approved tasks in PostgreSQL.
6. The priority engine calculates urgency, workload pressure, and suggested order.
7. The schedule generator produces the final organized schedule.
8. The chatbot answers questions using backend schedule data, not its own memory or raw inference.

### Chatbot flow
The chatbot should behave like a schedule assistant, not a free emotional companion.

```text
User asks a question
  ↓
FastAPI chat endpoint
  ↓
Backend fetches relevant schedule/task context
  ↓
LLM API receives only that context
  ↓
LLM returns an answer or explanation
```

Examples:
- What should be my top priority today?
- If I only have 2 hours, what should I finish first?
- Which tasks can be delayed?
- Why is this task ranked high?

## Tech stack

| Layer | Technology | Why it is used |
|---|---|---|
| Frontend | Next.js + TypeScript | Fast UI development and good component structure for a polished web app.[cite:58] |
| UI | Tailwind CSS + shadcn/ui | Fast to build clean, modern UI without overengineering. |
| Backend | FastAPI | Lightweight Python backend that is well suited for APIs, validation, and AI orchestration.[cite:118][cite:122] |
| Validation | Pydantic | Validates LLM outputs and request bodies. |
| Database | Supabase PostgreSQL | Simple hosted Postgres that is enough for tasks, projects, and notes.[cite:56][cite:64] |
| Storage | Supabase Storage, optional | Only needed if attachments are part of the MVP.[cite:56] |
| LLM API | OpenRouter or Ollama Cloud | Managed inference without GPU setup; supports API-based model access.[cite:197][cite:186] |
| ORM | SQLAlchemy | Standard Python ORM for relational data. |
| Migrations | Alembic | Simple schema migrations. |
| Deployment | Vercel for frontend, Railway or Render for FastAPI | Clean separation between UI and backend. |

## Database ERD

### Tables

#### workspaces
Used for one anonymous user workspace or one signed-in user workspace.

- id (uuid, primary key)
- created_at
- name, optional

#### projects
Optional grouping for tasks.

- id (uuid, primary key)
- workspace_id (foreign key)
- name
- color, optional
- created_at

#### tasks
Main table for scheduling.

- id (uuid, primary key)
- workspace_id (foreign key)
- project_id (foreign key, nullable)
- title
- description, nullable
- due_date, nullable
- estimated_minutes, nullable
- impact_score, default 3
- urgency_score, nullable
- priority_score, nullable
- priority_label, nullable
- status (`todo`, `in_progress`, `done`, `deferred`)
- source_type (`manual`, `ai_parsed`)
- ai_summary, nullable
- created_at
- updated_at
- completed_at, nullable

#### attachments
Only needed if file upload is included.

- id (uuid, primary key)
- task_id (foreign key)
- file_name
- storage_path
- mime_type
- extracted_text, nullable
- created_at

### ERD
```text
workspaces 1 ─── * projects
workspaces 1 ─── * tasks
projects   1 ─── * tasks
tasks      1 ─── * attachments
```

### Notes on data ownership
If the app later supports accounts, enable Row Level Security so each user can only access their own rows. Supabase documents RLS as the main way to enforce per-row authorization in client-accessible Postgres apps.[cite:64][cite:56]

## Detailed backend logic

### 1. Manual task creation
Endpoint:
- `POST /tasks`

Logic:
- Receive title, due date, optional description, optional project.
- Save directly to database.
- Recompute the schedule after save.

### 2. Brain dump parsing
Endpoint:
- `POST /tasks/parse`

Logic:
- Receive raw text such as: "Tomorrow finish proposal, Friday presentation, revise slides, read two papers."
- Send prompt to the LLM API.
- Require JSON output with fields like `title`, `due_date`, `estimated_minutes`, and `needs_confirmation`.
- Validate output with Pydantic.
- Return draft tasks to the frontend.
- Only save after user approval.

This endpoint should not save directly because the model can misread dates or invent details.

### 3. File parsing
Endpoint:
- `POST /tasks/{task_id}/attachments`

Logic:
- Upload file.
- Extract plain text.
- Optionally pass the extracted text to the LLM API for summary or next-action generation.
- Save only the summary and metadata if minimal storage is preferred.
- If file processing is slow, it can be pushed to a background task after the response is sent.[cite:118][cite:122]

### 4. Priority engine
Endpoint:
- Internal service or `POST /schedule/generate`

Logic:
- Fetch all active tasks.
- Compute urgency from due date proximity.
- Combine urgency with impact and estimated effort.
- Penalize overload if too many high-effort tasks are placed on the same day.
- Produce:
  - top 3 tasks for today,
  - one warning if workload is unrealistic,
  - one suggestion for what can be delayed.

Suggested simple formula:

```text
priority_score = urgency + impact - effort_penalty
```

This should stay deterministic in Python, not in the LLM.

### 5. Schedule generation
Endpoint:
- `GET /tasks/today`
- `GET /tasks/week`
- or internal schedule service

Logic:
- Sort tasks by priority score.
- Group tasks into today and upcoming.
- Optionally create simple time blocks such as morning, afternoon, and evening.
- Return a lightweight schedule object for the frontend.

### 6. Chat endpoint
Endpoint:
- `POST /chat/query`

Logic:
- Receive user question.
- Detect required context, for example today's schedule, one task detail, or this week's load.
- Fetch only relevant structured data from the database.
- Send that context to the LLM API with a strict system instruction: answer based on the provided schedule only.
- Return a concise answer.

The chatbot should never decide priorities independently. It should explain or summarize what the backend already calculated.

## Requirements

### Required product requirements
- Clean and responsive web UI.
- Manual task entry.
- Brain dump to structured task drafts.
- Daily priority view.
- Weekly load view.
- Chatbot for schedule Q and A.
- Optional note or attachment support.

### Backend requirements
- FastAPI app with REST endpoints.
- Schema validation for every request and every LLM response.
- Deterministic priority engine in Python.
- Postgres database.
- Optional background task handling for slow file processing.[cite:118]

### LLM API requirements
The chosen model/API should support:
- strong instruction following,
- structured output or reliable JSON output,
- enough context for task lists and notes,
- stable chat behavior.

Recommended approach:

| Role | Recommended option | Why |
|---|---|---|
| Main LLM API | OpenRouter | Flexible model access and structured outputs support for compatible endpoints.[cite:186][cite:187] |
| Alternative API | Ollama Cloud | Simpler managed API path inside the Ollama ecosystem.[cite:197][cite:77] |
| Main model | Qwen3-14B class instruct model | Strong fit for parsing, scheduling Q and A, and structured extraction in one stack.[cite:186][cite:191] |
| Lower-resource fallback | Llama 3.1 8B Instruct | Easier and cheaper to run through APIs while still strong enough for schedule chat.[cite:105][cite:108] |

### API integration requirements
- API key stored in backend environment variables only.
- Frontend never calls the LLM provider directly.
- Structured output should be used for task parsing endpoints.
- Plain chat completion can be used for schedule explanation endpoints.
- Provider and model should be pinned during demo to avoid inconsistent routing.

### Hosting requirements
- Frontend hosting for Next.js.
- Python backend hosting for FastAPI.
- Postgres database.
- Optional object storage.
- Managed LLM API provider account.

### Nice-to-have, not MVP
- User login.
- Calendar sync.
- Notifications.
- Smart recurring tasks.
- Multi-device persistence beyond a simple workspace.
- Advanced analytics.

## Recommended final architecture
The simplest strong version of this product is:
- Next.js frontend.
- FastAPI backend.
- Supabase Postgres.
- One managed LLM API provider, ideally OpenRouter.
- One main instruct model, ideally Qwen3-14B class.
- Rule-based scheduling logic in Python.
- Chatbot used only as a natural-language interface to schedule data.

This architecture is simple enough for a hackathon, clear enough for judges, and safer than building a productivity app that lets the LLM make unchecked planning decisions.
