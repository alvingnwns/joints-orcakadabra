# Frontend

Next.js (App Router, TypeScript) and Tailwind CSS web app.

Currently available (checkpoint CP3): the app shell (header, skip link, main area), warm design tokens in `app/globals.css`, a typed API client (`lib/api.ts`), and a banner that appears when the backend can't be reached.

## Setup and run (Windows PowerShell)

Requires Node 24.

```powershell
cd frontend
npm install
npm run dev            # http://localhost:3000 (start the backend too, see ../backend/README.md)
```

The backend URL defaults to `http://127.0.0.1:8000`. To change it, set `NEXT_PUBLIC_API_URL` in `frontend/.env.local`.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```
