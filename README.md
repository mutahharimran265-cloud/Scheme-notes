# SchemNotes

**Comment on circuit schematics like Google Docs comments — but anchored to the diagram.**

Upload a schematic (image or PDF), share a link, and let reviewers click anywhere on the diagram to drop a comment pin. No CAD software to install, no account required to comment.

---

## Run it live

Gets you a permanent URL that works on every device. Takes two deploys — the
**first one is expected to fail** (there's no database yet), the second one
works. Don't skip step 3.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmutahharimran265-cloud%2FScheme-notes%2Ftree%2Fcloud-sync-and-deploy&env=AUTH_SECRET,SCHEMNOTES_PLAN,DATABASE_URL&envDescription=AUTH_SECRET%3A%20random%2064-char%20hex%20string.%20SCHEMNOTES_PLAN%3A%20free%2Fpro%2Fteam.%20DATABASE_URL%3A%20leave%20as%20a%20placeholder%20for%20now%20%E2%80%94%20fixed%20in%20step%203%20below.&envLink=https%3A%2F%2Fgithub.com%2Fmutahharimran265-cloud%2FScheme-notes%2Fblob%2Fcloud-sync-and-deploy%2FDEPLOY.md&project-name=schemnotes&repository-name=schemnotes)

1. Click the button, fill in `AUTH_SECRET` (any random 64-char string) and
   `SCHEMNOTES_PLAN` (`pro` or `team` to unlock everything). For
   `DATABASE_URL`, type anything as a placeholder — click **Deploy**.
2. It fails — that's expected, there's no database attached yet.
3. Open the new project → **Storage** tab → **Create Database → Neon**
   (sets `DATABASE_URL` for real) and **Create → Blob** (for uploaded files).
4. **Deployments** tab → the failed one → **⋯ → Redeploy**. This time it
   builds the tables in Neon and succeeds — that's your permanent link.

Full walkthrough with screenshots-worth of detail: [`DEPLOY.md`](DEPLOY.md).

Prefer to run it yourself first? Clone this repo and double-click `START-SCHEMNOTES.bat` (Windows) — see [Getting started](#getting-started) below.

---

## Why

Getting feedback on a schematic today means either emailing a screenshot and receiving a messy thread with no visual anchor, or asking the reviewer to install the same CAD tool (KiCad, Altium, Eagle) just to look at the file. SchemNotes gives you a lightweight, CAD‑agnostic way to say **“comment right here”** on any exported schematic.

## Features

- **Upload** PNG, JPG, SVG, PDF — or a native **KiCad `.kicad_sch`**, which is auto‑rendered to SVG on the server (plus exports from any tool, or a photo of a whiteboard sketch).
- **Pan & zoom** viewer with fit‑to‑screen. PDFs render their first page to a crisp canvas.
- **Click‑to‑pin comments** stored as a **percentage** of the image, so pins stay put through zoom and resize.
- **Threaded discussions** with an **Open / In review / Resolved / Won't-fix** workflow — reply to any pin and triage like a GitHub PR conversation.
- **Instant search (Ctrl/Cmd+K)** — full-text over comments and replies, `#tag` filters, and status filters; jump straight to the pin.
- **Component linking** — tie a comment to a designator/net (`R12`, `NET_VBUS`), part number, and datasheet link; tag comments for grouping (`power`, `emi`).
- **Markdown + pasted images** — paste a scope capture or board photo straight into any comment box; bodies render as GFM markdown (lists, code, tables). Images stay local; remote images are never fetched. `@name@email.com` mentions highlight and (with SMTP configured) email the mentioned person a link to the comment.
- **REST API** for reading/creating comments programmatically — no account or token needed, same rate limits as the UI. See [`docs/API.md`](docs/API.md).
- **Review sidebar** listing every thread with All / Open / Resolved filters; click a thread to jump to its pin (and vice‑versa). Search + status filter on the dashboard as your project list grows.
- **No‑login commenting** — reviewers just pick a display name. A per‑browser token lets them edit/delete *their own* comments without an account.
- **Magic‑link sign‑in** (passwordless) for a **”My projects”** dashboard where owners can rename or delete their projects.
- **Shareable link** per project — native share sheet on phones, clipboard on desktop.
- **Export** — one PDF per project: the schematic with its numbered comment pins, followed by the comment list. Nothing else leaves the project.
- **Team workspaces** (Team plan) — shared projects with viewer/commenter/admin roles and email invites.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Viewer | `react-zoom-pan-pinch` + an SVG/canvas overlay; `pdfjs-dist` for PDFs |
| Database | SQLite via Prisma (swap `provider` to `postgresql` for production) |
| File storage | Local disk under `public/uploads/` (swap for S3 / Cloudflare R2) |
| Auth | Passwordless magic link (HMAC‑signed tokens, `httpOnly` cookie session) |

---

## Getting started

**Prerequisites:** Node.js 20+ and npm. (Optional: install [KiCad](https://www.kicad.org/) if you want to upload native `.kicad_sch` files — it's used to render them.)

**Easiest:** double-click **`START-SCHEMNOTES.bat`** (Windows) or run **`./start-schemnotes.sh`** (macOS/Linux). The launcher checks Node.js is installed, checks port 3000 is free, installs dependencies, **backs up the database**, applies migrations — stopping with a clear message if any step fails — and opens the browser only once the server actually responds.

Or manually:

```bash
# 1. Install dependencies (also generates the Prisma client + copies the pdf.js worker)
npm install

# 2. Create the local SQLite database (backs up an existing one first)
npm run db:migrate

# 3. Run the dev server
npm run dev
```

Open **http://localhost:3000**.

### Environment

Copy `.env.example` to `.env`. For local development the defaults work out of the box:

```env
DATABASE_URL="file:./dev.db"     # SQLite file at prisma/dev.db
AUTH_SECRET="change-me"          # HMAC secret for magic-link + session tokens
# APP_ORIGIN=https://your.domain # optional: force canonical magic-link URLs behind a proxy
```

> Generate a real secret with:
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### See it populated

With the dev server running, seed a demo project (a sample schematic with a few review comments):

```bash
npm run seed
# → prints a /project/... link you can open
```

The sample lives at `samples/sample-schematic.svg`.

---

## How it works

### Pin coordinates

A pin is stored as `xPercent` / `yPercent` (0–100) relative to the rendered image, **not** raw pixels. The viewer maps a click to a percentage using the image’s on‑screen bounding box, so pins land in the right place regardless of zoom level or screen size. Pins are drawn inside the zoom/pan layer but counter‑scaled (`scale(1/zoom)`) so they stay a constant size on screen.

### Comment model

`Project → SchematicFile → Comment`. A `Comment` with `parentCommentId = null` is a **thread root** and carries a pin location; replies hang off the root and have no coordinates. See [`prisma/schema.prisma`](prisma/schema.prisma).

### Native KiCad files

Upload a `.kicad_sch` directly and the server renders it to SVG with **`kicad-cli`** (the KiCad command‑line tool), then treats it like any other schematic — so pins, threads, and resolve all work, and the uploaded original stays downloadable. KiCad must be installed where the app runs; the binary is auto‑detected from a standard install (`C:\Program Files\KiCad\<ver>\bin\kicad-cli.exe`) or set `KICAD_CLI`. This is a **local / self‑hosted** capability (it won't run on stock serverless like Vercel). Altium, Eagle, and other native formats aren't rendered directly yet — export a PDF or SVG for those (both are accepted). See [`src/lib/kicad.ts`](src/lib/kicad.ts).

### Account‑less ownership

Anonymous commenters get a random **author token** stored in `localStorage`. It’s sent with each write and required (server‑side) to edit or delete a comment — so you can retract your own comment, but not someone else’s. Resolving/reopening is collaborative and open to anyone with the link. Tokens are never returned to other clients.

### Auth

`POST /api/auth/request` issues a short‑lived, HMAC‑signed magic link. In development the link is logged to the server console **and** returned to the UI so you can click straight through (no email provider needed). `GET /api/auth/verify` exchanges it for an `httpOnly` session cookie. To go to production, send the link via email (Resend, Postmark, SMTP) instead of logging it.

### Security

- Uploads are validated by MIME + extension **and magic-byte signature**, size‑capped (25 MB), and stored under random filenames.
- Uploaded files are served with `Content-Security-Policy: script-src 'none'; sandbox` and `X-Content-Type-Options: nosniff`, so a malicious SVG can’t execute script even if opened directly. Sensible default headers are applied app‑wide (see [`next.config.ts`](next.config.ts)).
- All comment writes are length‑limited and validated server‑side; edit/delete require a matching author token (`403` otherwise).
- Author tokens are stored as **SHA‑256 hashes** (never plaintext); user input is **sanitized** (script/iframe stripped); write endpoints are **rate‑limited** (in‑memory sliding window); project rename/delete require an authenticated owner.

---

## Project structure

```
src/
  app/
    page.tsx                 Upload landing page
    login/ dashboard/        Magic-link sign-in + owner dashboard
    project/[id]/page.tsx    Loads a project + threads, renders the workspace
    api/
      upload/                POST a file → creates Project + SchematicFile
      comments/              GET list · POST create · [id] PATCH/DELETE
      auth/                  request · verify · logout
  components/
    ProjectWorkspace.tsx     Client orchestrator (state, name gate, layout)
    SchematicViewer.tsx      Pan/zoom, pins, anchored popover, PDF rendering
    CommentSidebar.tsx       Thread list + filters
    ThreadPanel.tsx          A thread: comments, replies, resolve, edit/delete
    PinComposer.tsx          New-comment popover
  lib/                       prisma, auth, identity, api client, types, formatting
scripts/
  seed-demo.mjs              Seed a demo project (npm run seed)
  smoke.mjs                  End-to-end API/auth test (see below)
  copy-pdf-worker.mjs        Copies the pdf.js worker into /public (postinstall)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm start` | Serve the production build |
| `npm run seed` | Seed a demo project (server must be running) |
| `npm run backup` | Back up the SQLite database to `prisma/backups/` |
| `npm run db:migrate` | Back up the database, then run `prisma migrate dev` |
| `npm run lint` | ESLint |

## Data safety

- **Automatic backups** — the launchers and `npm run db:migrate` copy `prisma/dev.db` into `prisma/backups/` (rolling, newest 10 kept) *before* any migration touches it.
- **Export** — the **Export PDF** button on a project downloads the schematic with its comment pins and comment list as a single PDF. Your data is never locked in.
- **Undo windows** — deleting a comment, thread, or project shows an Undo toast; the deletion only executes after the window passes.
- **Local-first, permanently** — every core annotation feature works fully offline with no network dependency.

### End‑to‑end test

With the dev server running:

```bash
node scripts/smoke.mjs samples/sample-schematic.svg
```

Exercises the full comment lifecycle, the status workflow, tags/component metadata, image attachments, ownership‑token enforcement, input validation, cascade delete, and the magic‑link auth + project‑ownership chain (32 assertions), cleaning up after itself.

---

## Going to production

- **Database:** change the Prisma datasource `provider` to `postgresql` and point `DATABASE_URL` at managed Postgres (Neon, Supabase). Re‑run `prisma migrate deploy`.
- **File storage:** swap the local‑disk writes in [`src/app/api/upload/route.ts`](src/app/api/upload/route.ts) for S3‑compatible storage (Cloudflare R2 / AWS S3) and store the object URL.
- **Email:** replace the console log in [`src/app/api/auth/request/route.ts`](src/app/api/auth/request/route.ts) with a real email send.
- **Secret:** set a strong `AUTH_SECRET`.

## Roadmap (post‑MVP)

- Multi‑page PDF viewing (currently page 1 only).
- Real‑time presence while multiple reviewers are on the same schematic.
- Billing self‑serve (Stripe checkout is wired; needs a live Stripe account).
