import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { hasFeatureForEmail } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-account cloud-sync target (this is the "local" side of sync). Gated to
// signed-in Pro accounts. The cloud token is stored but never returned.
async function guard(): Promise<{ email: string } | NextResponse> {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Sign in to configure cloud sync." }, { status: 401 });
  if (!(await hasFeatureForEmail("cloud_sync", email))) {
    return NextResponse.json({ error: "Cloud sync is a Pro feature." }, { status: 402 });
  }
  return { email };
}

export async function GET() {
  const g = await guard();
  if (g instanceof NextResponse) return g;
  const cfg = await prisma.syncConfig.findUnique({ where: { email: g.email } });
  return NextResponse.json({
    cloudUrl: cfg?.cloudUrl ?? "",
    tokenSet: Boolean(cfg?.cloudToken),
    lastSyncAt: cfg?.lastSyncAt ?? null,
    lastError: cfg?.lastError ?? null,
  });
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if (g instanceof NextResponse) return g;

  const data = await req.json().catch(() => null);
  const cloudUrl = typeof data?.cloudUrl === "string" ? data.cloudUrl.trim().replace(/\/+$/, "") : "";
  const cloudToken = typeof data?.cloudToken === "string" ? data.cloudToken.trim() : "";

  let ok = false;
  try {
    const u = new URL(cloudUrl);
    ok = u.protocol === "http:" || u.protocol === "https:";
  } catch {
    ok = false;
  }
  if (!ok) return NextResponse.json({ error: "Enter a valid cloud URL (http/https)." }, { status: 400 });
  if (!cloudToken) return NextResponse.json({ error: "Enter the cloud API token." }, { status: 400 });

  await prisma.syncConfig.upsert({
    where: { email: g.email },
    create: { email: g.email, cloudUrl, cloudToken },
    update: { cloudUrl, cloudToken, lastError: null },
  });
  return NextResponse.json({ ok: true });
}
