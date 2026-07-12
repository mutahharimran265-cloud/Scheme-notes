import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/entitlements";
import { dbProvider } from "@/lib/cloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liveness/readiness probe for deploys, load balancers, and uptime monitors.
// 200 when the database is reachable, 503 otherwise. `SELECT 1` is valid on
// both SQLite (local) and Postgres (cloud).
export async function GET() {
  let dbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  return NextResponse.json(
    {
      ok: dbConnected,
      app: "schemnotes",
      version: process.env.npm_package_version ?? "0.1.0",
      plan: getPlan(),
      db: { provider: dbProvider(), connected: dbConnected },
      time: new Date().toISOString(),
    },
    { status: dbConnected ? 200 : 503 },
  );
}
