# Frontend

Next.js (App Router, TypeScript) and Tailwind CSS web app.

Pages: Today (`/`), Week (`/week`), All tasks (`/tasks`), Brain dump (`/dump`), plus the schedule chat panel and a Settings dialog (language, productive time per day, about) on every page. English and Indonesian (`lib/i18n/`). Deployment: see the root [`README.md`](../README.md#deploy).

## Mascot

The orca mascot greets you on Today and is the face of the chat helper (header, replies, thinking), the brain dump while it sorts, and friendly error screens. The four files in `public/mascot/` (`hello.svg`, `think.svg`, `happy.svg`, `oops.svg`) are simple placeholders: replace them with your own artwork using the same file names and nothing else needs to change. They are decorative (`alt=""`), square or nearly square works best, and `components/ui/Mascot.tsx` is the one place that uses them.

## Design system ("Calm Intelligence")

Everything visual comes from tokens in `app/globals.css`; components never hard-code a color or size.

- Colors: `background`, `surface`, `surface-muted`, `primary` (+ `-hover`, `-soft`), `on-primary`, `text`, `text-secondary`, `border` (dividers only), `border-strong` (form controls and outlined buttons), `focus`, `attention` (+ `-text`), `danger` (+ `-hover`, `-soft`, `-text`), `success`. `app/tokens.test.ts` checks 28 contrast pairs from the real CSS, so a palette edit cannot silently break WCAG AA. Amber means "worth a look", red is only for errors and deleting.
- Status colors (each a stripe/bar color, a soft tint, a badge color and an AA text color; always paired with a word and an icon): Focus is the brand green, `soon` amber, `whenever` sky blue, `later` lilac, `done` sage. A day that is nearly or fully booked uses amber (`soon`, from 75 percent of the person's daily time) and coral (`warm`, when the backend calls the day heavy). `--color-wash` is the soft green behind the Today greeting and the page's top edge. Depth is a hairline plus a wide faint shadow (`shadow-soft`, `shadow-lift`), never a hard drop shadow.
- Type: Geist; `text-display` (page title, 24 to 32 px), `text-section` (18 px), `text-base` (body), `text-sm` (secondary), `text-meta` (13 px, the smallest allowed).
- Shape and space: Tailwind's 4 px scale; `rounded-control` 12 px (buttons, inputs), `rounded-card` 16 px, `rounded-dialog` 20 px; buttons and inputs are at least 44 px tall.
- Components live in `components/ui/`: `Button` (primary, secondary, quiet, destructive; `buttonClasses` for links), `IconButton`, `Icon` (Lucide, one stroke width), `Field` with `Input`/`Textarea`/`Select`, `Badge`, `Card`, `Notice`, `EmptyState`, `Skeleton`, and `Dialog` (a controlled modal on the native `<dialog>`: focus trap, Esc, focus returns to the opener). Use `fill()` from `lib/i18n` for text with `{placeholders}`; a test fails if English and Indonesian differ in keys or placeholders.
- Rules the UI follows: color is never the only signal (labels and icons come with it); the backend decides ranking, the frontend only explains it; AI output is shown as "not saved yet" until the person approves it; every request that can fail keeps what the person typed.
- Layout: one `<nav>`, in the header from 1024 px and a bottom bar below; the chat button is a compact icon on phones; long words wrap (`wrap-anywhere`) instead of widening the page.

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
