# Frontend

Next.js (App Router, TypeScript) and Tailwind CSS web app.

Pages: Today (`/`), Week (`/week`), Brain dump (`/dump`), plus the schedule chat panel and About dialog on every page. English and Indonesian (`lib/i18n/`). Deployment: see the root [`README.md`](../README.md#deploy).

## Setup and run (Windows PowerShell)

Requires Node 24.

```powershell
cd frontend
npm install
npm run dev            # http://localhost:3000 (start the backend too, see ../backend/README.md)
```

The backend URL defaults to `http://127.0.0.1:8000`. To change it, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL`.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```
