# joints-orcakadabra

A friendly AI task scheduler. It helps you see what to do next, and it is fine to postpone, simplify, or skip things. The AI only parses tasks and explains the schedule. Priorities and scheduling are computed deterministically in the backend.

- Product and architecture: [`system-design.md`](system-design.md)
- Step-by-step build plan: [`IMPLEMENTATION.md`](IMPLEMENTATION.md)

## Project layout

```text
backend/               FastAPI service (tasks, priority engine, schedule, LLM calls)
frontend/              Next.js + TypeScript web app
assets/illustrations/  Placeholder SVG illustrations (see IMPLEMENTATION.md §4)
system-design.md       Product and system design
IMPLEMENTATION.md      Ordered implementation checkpoints
```

## Local setup

- Backend: [`backend/README.md`](backend/README.md) (Python 3.12, Docker Postgres).
- Frontend: [`frontend/README.md`](frontend/README.md) (Node 24).

Secrets such as API keys belong only in local `.env` files. Those are ignored by git, and `.env.example` templates are committed instead.

## Deploy

Three pieces: **Supabase** (Postgres), **Railway or Render** (backend), **Vercel** (frontend). Local development keeps using Docker Postgres; production only differs by environment variables.

### 1. Database (Supabase)

1. Create a project. In **Connect**, copy the **Session pooler** connection string (port 5432; it works over IPv4 and supports everything the app and Alembic need).
2. Turn it into the app's format: `postgresql+psycopg://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require`

The tables are created by the backend on its first start (`alembic upgrade head` runs before the server).

### 2. Backend (Railway or Render)

Root directory: `backend`. Python 3.12 comes from `backend/.python-version`; dependencies from `requirements.txt`.

| Setting | Value |
|---|---|
| Start command | Railway reads `backend/Procfile`. On Render, paste the same command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check path | `/health` |
| `DATABASE_URL` | the Supabase string from step 1 |
| `CORS_ORIGINS` | the Vercel URL, e.g. `https://pikoplan.vercel.app` (no trailing slash; comma-separate several) |
| `LLM_API_KEY` | your OpenRouter key (secret) |
| `LLM_MODEL` | `nvidia/nemotron-3-super-120b-a12b:free` (or the paid `qwen/qwen3-14b`: no daily cap, no provider logging) |
| `LLM_CHAT_MODEL` | `google/gemma-4-31b-it:free` (falls back to `LLM_MODEL` when rate-limited) |

Free OpenRouter models share a daily request cap (50/day on a free account) and NVIDIA logs free-endpoint requests. For a public demo, the paid models cost a fraction of a cent per request.

### 3. Frontend (Vercel)

Import the repo, set **Root Directory** to `frontend` (Next.js is detected), and add `NEXT_PUBLIC_API_URL` = the backend's public URL (no trailing slash). It is read at build time, so redeploy after changing it.

### Post-deploy smoke checklist

1. `https://<backend>/health` returns `{"status":"ok"}`.
2. Open the Vercel URL: no "can't reach the server" banner (if it appears, check `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS`).
3. Add a task on Today; reload: it is still there (database works).
4. Mark it done → the celebrate toast appears; Undo brings it back.
5. Week: the task shows on its day with a load label.
6. Brain dump: "call mum tomorrow, buy milk" → drafts appear → Save → they are on Today (LLM key works).
7. Chat: "What should I do first?" gets an answer about your tasks.
8. Switch to Bahasa Indonesia and reload: the language sticks.
9. No secrets in the frontend bundle: `cd frontend; npm run build; Select-String -Path .next -Pattern "sk-or-" -SimpleMatch -List` (run recursively over `.next`) finds nothing.

Anyone who knows a workspace id can open that workspace (no login, decision C8 in `IMPLEMENTATION.md`). The AI endpoints have no per-user rate limit; the OpenRouter key's credit limit is the cap.
