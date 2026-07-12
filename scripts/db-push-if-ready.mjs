#!/usr/bin/env node
// Create/sync the database tables during a cloud build — but ONLY when a real
// Postgres DATABASE_URL is present.
//
// Why this exists: on Vercel you can't attach a database until AFTER the
// project's first build, so that first build runs with no (or a placeholder)
// DATABASE_URL. Running `prisma db push` directly there hard-fails with
// "Error P1012: the URL must start with the protocol postgresql://", which
// aborts the whole deploy. This guard makes the build SUCCEED in that case
// (skipping the push); once the database is attached and you redeploy,
// DATABASE_URL is set and the tables get created normally.
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL || "";
const isPostgres = /^postgres(ql)?:\/\//i.test(url.trim());

if (!isPostgres) {
  console.warn(
    "\n⚠️  Skipping `prisma db push`: no Postgres DATABASE_URL is set yet.\n" +
      "   The build will still succeed. Next step: attach a database\n" +
      "   (Vercel → Storage → Create Database → Neon), then Redeploy —\n" +
      "   this step will then create your tables automatically.\n",
  );
  process.exit(0);
}

console.log("Creating / syncing database tables (prisma db push)…");
const res = spawnSync("npx prisma db push --skip-generate", {
  stdio: "inherit",
  shell: true,
});
// Propagate a genuine push failure (bad credentials, unreachable DB, …) so a
// real database problem is visible rather than hidden — only the "not attached
// yet" case above is swallowed.
process.exit(res.status ?? 1);
