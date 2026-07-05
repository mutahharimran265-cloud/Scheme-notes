import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSessionEmail, hashToken } from "@/lib/auth";
import { cleanText } from "@/lib/comments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

// Token management follows the export rule: open on a local install (it's the
// machine owner's data), session-gated when hosted.
async function authorized(req: NextRequest): Promise<boolean> {
  if (LOCAL_HOSTS.has(req.nextUrl.hostname)) return true;
  return Boolean(await getSessionEmail());
}

// GET /api/tokens -> list tokens (never the secret — only metadata).
export async function GET(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Sign in to manage API tokens." }, { status: 401 });
  }
  const tokens = await prisma.apiToken.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdAt: true, lastUsedAt: true },
  });
  return NextResponse.json({ tokens });
}

// POST /api/tokens { label } -> create; the secret is returned exactly once.
export async function POST(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Sign in to manage API tokens." }, { status: 401 });
  }
  const data = await req.json().catch(() => null);
  const label = cleanText(data?.label, 60) || "API token";

  const secret = `sn_${randomBytes(24).toString("base64url")}`;
  const created = await prisma.apiToken.create({
    data: { tokenHash: hashToken(secret), label },
  });

  return NextResponse.json(
    { id: created.id, label: created.label, token: secret },
    { status: 201 },
  );
}
