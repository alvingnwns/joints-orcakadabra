Initialize joints-orcakadabra

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

`frontend/` currently only contains a placeholder README. It is filled in by the checkpoints in `IMPLEMENTATION.md`.

## Local setup

Completed as each part is built:

- Backend: see [`backend/README.md`](backend/README.md) (available since CP1; CP2 adds the local database).
- Frontend: see [`frontend/README.md`](frontend/README.md) (available since CP3).

Secrets such as API keys belong only in local `.env` files. Those are ignored by git, and `.env.example` templates are committed instead.
