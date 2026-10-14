# Backend

FastAPI service for tasks, the deterministic priority engine, schedule generation, and LLM calls.

Currently available (checkpoint CP1): the app skeleton, `GET /health`, settings, and the test setup.

## Setup

Requires Python 3.12. [`uv`](https://docs.astral.sh/uv/) is an easy way to get it (`uv python install 3.12`).

```bash
cd backend
python3.12 -m venv .venv                 # or: uv venv --python 3.12 .venv
source .venv/bin/activate
pip install -r requirements-dev.txt      # or: uv pip install -r requirements-dev.txt
cp .env.example .env                     # optional for now; nothing in CP1 needs real values
```

If the repository lives on a OneDrive-synced or Windows-mounted drive (for example `/mnt/c/...` in WSL), installing packages into `backend/.venv` can fail with "Operation not permitted". Create the virtual environment outside the repository instead, for example `uv venv --python 3.12 ~/.venvs/orca-backend`.

## Run and check

```bash
uvicorn app.main:app --reload --port 8000   # then: curl localhost:8000/health
pytest -q
ruff check . && ruff format --check .
```

Configuration is read from environment variables or `backend/.env` (see `.env.example`). Secrets such as `LLM_API_KEY` belong only there and are never committed.
