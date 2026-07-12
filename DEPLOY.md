# Deploying SchemNotes

SchemNotes runs in two modes from the same codebase:

| Mode | Database | Sync | Who it's for |
|------|----------|------|--------------|
| **Local** (default) | SQLite (`prisma/dev.db`) | none — single machine | Solo review, offline, free |
| **Cloud** | PostgreSQL | across every device you sign in on | Teams / multi-device (Pro) |

**How cloud sync works:** projects are owned by the email you sign in with
(passwordless magic link). Point the app at a shared Postgres database and sign
in with the same email anywhere — you see the same projects. There is no extra
sync engine to babysit; the shared database *is* the sync.

---

## Option A — Docker Compose (self-host, one command)

Brings up SchemNotes + Postgres together.

```bash
# 1. A strong session secret (required — compose refuses to start without it)
echo "AUTH_SECRET=$(openssl rand -hex 32)" > .env

# 2. Build and run
docker compose up --build

# 3. Open http://localhost:3000  (health check: http://localhost:3000/api/health)
```

Data persists in named volumes (`db-data` for Postgres, `uploads` for uploaded
schematics), so restarts keep your projects and files.

### Using a managed Postgres (Neon, Supabase, …)

If your database is already hosted (e.g. **Neon**), skip the bundled Postgres
and run just the app container against it — you only need a volume for uploaded
files:

```bash
docker build -t schemnotes .
docker run -d -p 3000:3000 \
  -v schemnotes-uploads:/app/public/uploads \
  -e DB_PROVIDER=postgresql \
  -e DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx.REGION.aws.neon.tech/DB?sslmode=require" \
  -e AUTH_SECRET="$(openssl rand -hex 32)" \
  -e SCHEMNOTES_PLAN=pro \
  schemnotes
```

The container creates the tables in your Neon database on first start. Use
Neon's **direct** (non-pooled) connection string. Your data lives in Neon plus
the `schemnotes-uploads` volume — nothing is deleted. Run this on any host with
a disk (an Oracle Always-Free VM = fully free; a small VPS; your own machine).

### Vercel + Neon (serverless — no server to manage)

Vercel runs the app, **Neon** is the database, and **Vercel Blob** stores
uploaded files (Vercel has no writable disk). All wired up:

1. Import the repo into Vercel (New Project → pick `Scheme-notes`).
2. Add two stores to the project:
   - **Neon** (Vercel → Storage → Neon, or paste your Neon string) → sets `DATABASE_URL`.
   - **Blob** (Vercel → Storage → Blob) → sets `BLOB_READ_WRITE_TOKEN` automatically.
3. Add env vars (Settings → Environment Variables):
   - `DB_PROVIDER = postgresql`
   - `AUTH_SECRET =` a strong secret (`openssl rand -hex 32`)
   - `SCHEMNOTES_PLAN = pro` or `team` (unlocks comment version history, and
     on `team` also shared team workspaces)
   - optional: `NEXT_PUBLIC_APP_URL`, plus `SMTP_*` / `STRIPE_*` (below).
4. **Deploy.** The `vercel-build` script switches Prisma to Postgres, creates
   your tables in Neon, and builds the app.

> **Deployed with the "Deploy with Vercel" button on the README instead?**
> That flow triggers a build immediately, before you can add Storage — so the
> **first deploy fails** with a Prisma error (`the URL must start with the
> protocol postgresql://`). That's expected, not a bug: add Neon + Blob per
> step 2 above, then **Deployments → the failed one → ⋯ → Redeploy** (no code
> change needed). It succeeds once `DATABASE_URL` is real.

- Use Neon's standard connection string; tables are created on first deploy.
- Uploaded files live in Vercel Blob (free tier) and your data in Neon — both
  persistent, nothing auto-deleted.
- ⚠️ **Native KiCad rendering doesn't work on Vercel** — it needs the
  `kicad-cli` program, which serverless can't run. Upload PDF/SVG/PNG there (or
  export your KiCad schematic to SVG/PDF first). Everything else works.

## Option B — A managed host (Railway / Render / Fly.io / a VPS)

1. **Provision a Postgres database** (the host's add-on, or Neon/Supabase) and
   copy its connection string.
2. **Deploy this repo** using the included `Dockerfile`.
3. **Attach a persistent disk mounted at `/app/public/uploads`** — uploaded
   schematics are written to disk, so a purely ephemeral filesystem loses them.
4. **Set the environment variables** below.

The container runs `prisma db push` on start to create/sync the schema, then
`next start`.

## Option C — Free forever, always-on, keeps your data (Oracle Cloud Always Free)

Free PaaS tiers wipe uploaded files on restart or expire the database. To run in
the cloud for free **without** losing data, use a free VM and the Compose stack
from Option A — the data lives in named volumes on the VM's own disk, so nothing
is ever deleted.

**Oracle Cloud "Always Free"** gives a real VM (Ampere ARM, up to ~24 GB RAM) +
200 GB disk that stay free indefinitely:

1. Sign up at cloud.oracle.com. A card is required for identity verification,
   but Always Free resources are never charged.
2. Create an **Always Free** Compute instance (shape *VM.Standard.A1.Flex*,
   image *Ubuntu 22.04*).
3. Allow the app port: add an **ingress rule for TCP 3000** to the instance's
   subnet security list, and open it on the VM's own firewall.
4. Install Docker: `curl -fsSL https://get.docker.com | sudo sh`.
5. Copy this repo onto the VM, then run Option A there:
   `echo "AUTH_SECRET=$(openssl rand -hex 32)" > .env && sudo docker compose up -d --build`
6. Open `http://<vm-public-ip>:3000`. Add a domain + HTTPS later with a reverse
   proxy (Caddy does it in ~3 lines).

Postgres data and uploaded schematics sit in Docker volumes on the VM's disk —
they survive restarts and reboots and are never auto-deleted.

**No card, or want it even simpler?** Run Option A on any computer you leave on
(an old laptop, a Raspberry Pi) and expose it with a free **Cloudflare Tunnel**
(`cloudflared tunnel --url http://localhost:3000`) — your data stays on your own
disk. A small always-on **VPS** (Hetzner / DigitalOcean, ~$4–5/mo) runs the exact
same `docker compose up` if you'd rather not use your own hardware.

---

## Environment variables

| Variable | Required | Example / default | Notes |
|----------|----------|-------------------|-------|
| `DB_PROVIDER` | cloud | `postgresql` | `sqlite` (default) locally; `postgresql` for cloud. The Docker image is built for Postgres. |
| `DATABASE_URL` | yes | `postgresql://user:pass@host:5432/schemnotes?sslmode=require` | SQLite locally: `file:./dev.db` |
| `AUTH_SECRET` | **yes (prod)** | 64 hex chars | Signs sessions. In production the app refuses the insecure dev default. Generate: `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | yes | `https://schemnotes.example.com` | Used to build magic links. |
| `SCHEMNOTES_PLAN` | no | `pro` | `free` (default), `pro`, or `team`. Deployment-wide floor for paid features (version history on Pro; team workspaces on Team) — a per-account Stripe subscription can also grant these, see Payments below. |
| `KICAD_CLI` | no | path to `kicad-cli` | Enables native `.kicad_sch` rendering. Not in the default image — install KiCad in a custom image, or upload PDF/SVG. |

> **Plans:** `SCHEMNOTES_PLAN` sets a deployment-wide floor — for self-hosting,
> set it to `pro` to unlock everything. For multi-tenant SaaS, leave it `free`
> and let per-account Stripe subscriptions drive access (see Payments below).

---

## Email (magic-link sign-in)

Sign-in links are emailed over **SMTP** — works with any provider (Gmail app
password, Resend, SendGrid, Postmark, Mailgun, …). Set:

```
SMTP_HOST  SMTP_PORT  SMTP_SECURE  SMTP_USER  SMTP_PASS  SMTP_FROM
APP_ORIGIN=https://schemnotes.example.com   # so links point at your public URL
```

Without SMTP the link is written to the server log (and returned in dev) so the
app still runs — but hosted users can't receive it, so configure SMTP in
production.

## Payments (Stripe subscriptions)

Upgrades run through Stripe Checkout; a webhook flips the account to Pro/Team.

1. Create two recurring **Prices** in Stripe (Pro, Team); copy their ids.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`.
3. Add a **webhook** to `POST /api/billing/webhook` for `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`, and set
   `STRIPE_WEBHOOK_SECRET`. Local testing:
   `stripe listen --forward-to localhost:3000/api/billing/webhook`.
4. Signed-in users then see **Upgrade to Pro** on the dashboard → Stripe
   Checkout → the webhook writes `Account.plan`, which `getPlanForEmail()` reads.

Without Stripe env, the upgrade UI stays hidden and plans fall back to
`SCHEMNOTES_PLAN`. (You add your own Stripe account + keys — the integration is
built and ready.)

---

## Notes

- **Migrations:** local dev uses Prisma migrations (`npm run db:migrate`). The
  cloud path uses `prisma db push` because the committed migration history is
  SQLite-specific. `scripts/use-db-provider.mjs` swaps the datasource provider
  at build time (the Docker image already does this).
- **Uploads:** stored under `public/uploads`. Always back this with a volume in
  any deployment.
- **Health check:** `GET /api/health` returns `200` when the database is
  reachable (and reports provider + cloud-sync status), `503` otherwise — point
  your load balancer / uptime monitor at it.
