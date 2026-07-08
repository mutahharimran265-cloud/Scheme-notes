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

## Option B — A managed host (Railway / Render / Fly.io / a VPS)

1. **Provision a Postgres database** (the host's add-on, or Neon/Supabase) and
   copy its connection string.
2. **Deploy this repo** using the included `Dockerfile`.
3. **Attach a persistent disk mounted at `/app/public/uploads`** — uploaded
   schematics are written to disk, so a purely ephemeral filesystem loses them.
4. **Set the environment variables** below.

The container runs `prisma db push` on start to create/sync the schema, then
`next start`.

---

## Environment variables

| Variable | Required | Example / default | Notes |
|----------|----------|-------------------|-------|
| `DB_PROVIDER` | cloud | `postgresql` | `sqlite` (default) locally; `postgresql` for cloud. The Docker image is built for Postgres. |
| `DATABASE_URL` | yes | `postgresql://user:pass@host:5432/schemnotes?sslmode=require` | SQLite locally: `file:./dev.db` |
| `AUTH_SECRET` | **yes (prod)** | 64 hex chars | Signs sessions. In production the app refuses the insecure dev default. Generate: `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | yes | `https://schemnotes.example.com` | Used to build magic links. |
| `SCHEMNOTES_PLAN` | no | `pro` | `free` (default), `pro`, or `team`. Unlocks cloud sync + API tokens for the deployment. |
| `KICAD_CLI` | no | path to `kicad-cli` | Enables native `.kicad_sch` rendering. Not in the default image — install KiCad in a custom image, or upload PDF/SVG. |

> **Plan / billing:** `SCHEMNOTES_PLAN` gates the paid features at the
> deployment level. Per-user billing (Stripe/Gumroad → per-account plans) is
> not wired here — resolve the plan from your billing system in
> `getPlan()` (`src/lib/entitlements.ts`) when you add checkout.

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
