// Rolling local backup of the SQLite database.
//   node scripts/backup-db.mjs [label]
// Called by the launchers before `prisma migrate deploy`, and by `npm run backup`.
// Keeps the newest MAX_BACKUPS copies in prisma/backups/.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";

const MAX_BACKUPS = 10;
const label = (process.argv[2] || "manual").replace(/[^a-z0-9_-]/gi, "");
const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const backupDir = path.join(process.cwd(), "prisma", "backups");

if (!existsSync(dbPath)) {
  console.log("[backup] No database yet — nothing to back up.");
  process.exit(0);
}

try {
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19); // 2026-07-03T12-34-56
  const dest = path.join(backupDir, `dev-${stamp}-${label}.db`);
  copyFileSync(dbPath, dest);
  // SQLite sidecar files (only present mid-transaction; safe to copy if there).
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    if (existsSync(dbPath + suffix)) copyFileSync(dbPath + suffix, dest + suffix);
  }
  console.log(`[backup] Database backed up to ${path.relative(process.cwd(), dest)}`);

  // Prune old backups, newest first.
  const backups = readdirSync(backupDir)
    .filter((f) => /^dev-.*\.db$/.test(f))
    .map((f) => ({ f, t: statSync(path.join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of backups.slice(MAX_BACKUPS)) {
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      const p = path.join(backupDir, f + suffix);
      if (existsSync(p)) unlinkSync(p);
    }
  }
} catch (err) {
  console.error("[backup] FAILED:", err.message);
  process.exit(1);
}
