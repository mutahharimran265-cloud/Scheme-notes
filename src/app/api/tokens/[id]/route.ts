import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { hasFeature } from "@/lib/entitlements";

export const runtime = "nodejs";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

// DELETE /api/tokens/[id] -> revoke a token immediately.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasFeature("api_tokens")) {
    return NextResponse.json(
      { error: "API tokens are a Pro feature. Upgrade to script the review API." },
      { status: 402 },
    );
  }
  const isLocal = LOCAL_HOSTS.has(req.nextUrl.hostname);
  if (!isLocal && !(await getSessionEmail())) {
    return NextResponse.json({ error: "Sign in to manage API tokens." }, { status: 401 });
  }
  const { id } = await params;
  const token = await prisma.apiToken.findUnique({ where: { id } });
  if (!token) {
    return NextResponse.json({ error: "Token not found." }, { status: 404 });
  }
  await prisma.apiToken.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
