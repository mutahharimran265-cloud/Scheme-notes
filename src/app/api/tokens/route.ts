import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSessionEmail, hashToken } from "@/lib/auth";
import { cleanText } from "@/lib/comments";
import { hasFeatureForEmail } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

// Scriptable API tokens are a Pro feature, resolved per signed-in account (or
// the deployment plan on a local install). Management otherwise follows the
// export rule: open locally (the machine owner's data), session-gated when
// hosted. Returns an error response to send, or null if OK.
async function guard(req: NextRequest): Promise<{ email: string | null } | NextResponse> {
  const email = await getSessionEmail();
  const authed = LOCAL_HOSTS.has(req.nextUrl.hostname) || Boolean(email);
  if (!authed) {
    return NextResponse.json({ error: "Sign in to manage API tokens." }, { status: 401 });
  }
  if (!(await hasFeatureForEmail("api_tokens", email))) {
    return NextResponse.json(
      { error: "API tokens are a Pro feature. Upgrade to script the review API." },
      { status: 402 },
    );
  }
  return { email };
}

// GET /api/tokens -> list tokens (never the secret — only metadata). Scoped to
// the signed-in account when hosted; shows all on a local install.
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  const tokens = await prisma.apiToken.findMany({
    where: g.email ? { email: g.email } : {},
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdAt: true, lastUsedAt: true },
  });
  return NextResponse.json({ tokens });
}

// POST /api/tokens { label } -> create; the secret is returned exactly once.
// The token is owned by the signed-in account, so it can also authenticate
// cloud sync as that account.
export async function POST(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  const data = await req.json().catch(() => null);
  const label = cleanText(data?.label, 60) || "API token";

  const secret = `sn_${randomBytes(24).toString("base64url")}`;
  const created = await prisma.apiToken.create({
    data: { tokenHash: hashToken(secret), label, email: g.email },
  });

  return NextResponse.json(
    { id: created.id, label: created.label, token: secret },
    { status: 201 },
  );
}
