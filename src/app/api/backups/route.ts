import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { getSessionEmail } from "@/lib/auth";
import { hasFeatureForEmail } from "@/lib/plan";
import { isRemoteStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const backupsDir = () => path.join(process.cwd(), "prisma", "backups");

// Automated backups are a Pro feature. Same access rule as export: open on a
// local install (the machine owner), session-gated when hosted.
async function guard(req: NextRequest): Promise<NextResponse | null> {
  const email = await getSessionEmail();
  const authed = LOCAL_HOSTS.has(req.nextUrl.hostname) || Boolean(email);
  if (!authed) return NextResponse.json({ error: "Sign in to manage backups." }, { status: 401 });
  if (!(await hasFeatureForEmail("cloud_backup", email))) {
    return NextResponse.json({ error: "Automated backups are a Pro feature." }, { status: 402 });
  }
  return null;
}

// GET /api/backups -> list rolling DB backups (self-hosted SQLite).
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g) return g;
  if (process.env.DB_PROVIDER === "postgresql") {
    return NextResponse.json({
      backups: [],
      note: "On Postgres, point-in-time backups are handled by your database provider (e.g. Neon).",
    });
  }
  let files: string[] = [];
  try {
    files = await readdir(backupsDir());
  } catch {
    files = [];
  }
  const backups: { name: string; sizeBytes: number; createdAt: string }[] = [];
  for (const f of files.filter((f) => f.endsWith(".db"))) {
    try {
      const s = await stat(path.join(backupsDir(), f));
      backups.push({ name: f, sizeBytes: s.size, createdAt: s.mtime.toISOString() });
    } catch {
      /* skip unreadable */
    }
  }
  backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ backups });
}

// POST /api/backups -> run a backup now (self-hosted SQLite).
export async function POST(req: NextRequest) {
  const g = await guard(req);
  if (g) return g;
  if (isRemoteStorage() || process.env.DB_PROVIDER === "postgresql") {
    return NextResponse.json(
      { error: "Manual backups apply to the self-hosted SQLite database; on Postgres use your provider's backups." },
      { status: 400 },
    );
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(process.execPath, ["scripts/backup-db.mjs", "manual"], {
        cwd: process.cwd(),
      });
      proc.on("error", reject);
      proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("Backup script failed."))));
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Backup failed." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
