# Backend

FastAPI service for tasks, the deterministic priority engine, schedule generation, and LLM calls.

Currently available (up to checkpoint CP5): `GET /health`, anonymous workspaces (`POST /workspaces`, `GET /workspaces/{id}`), task CRUD (`/tasks`, scoped to the workspace sent in the `X-Workspace-Id` header; interactive docs at `/docs`), settings, the `workspaces` and `tasks` database tables with Alembic migrations, and the test setup.

## Setup (Windows PowerShell)

Requires Python 3.12 and Docker Desktop. [`uv`](https://docs.astral.sh/uv/) is an easy way to get Python (`uv python install 3.12`).

```powershell
cd backend
uv venv --python 3.12 .venv
.\.venv\Scripts\Activate.ps1          # if blocked: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
uv pip install -r requirements-dev.txt
Copy-Item .env.example .env           # optional; the defaults work for local development
```

## Database

Local Postgres 16 runs in Docker (`docker-compose.yml` in the repo root). It also creates a separate `orca_test` database for the tests.

```powershell
docker compose up -d --wait db        # run from the repo root
cd backend
alembic upgrade head                  # create or update the tables; run alembic from backend\
```

Use `127.0.0.1`, not `localhost`, in `DATABASE_URL`. On Windows, `localhost` tries IPv6 first and each connection can stall for minutes.

## Run and check

```powershell
uvicorn app.main:app --reload --port 8000   # then open http://127.0.0.1:8000/health
pytest -q                                   # needs the database running
ruff check . ; ruff format --check .
```

Configuration is read from environment variables or `backend/.env` (see `.env.example`). Secrets such as `LLM_API_KEY` belong only there and are never committed.
