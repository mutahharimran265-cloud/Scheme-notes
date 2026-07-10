import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { hasFeatureForEmail } from "@/lib/plan";

export const runtime = "nodejs";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

// DELETE /api/tokens/[id] -> revoke a token immediately.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const email = await getSessionEmail();
  const isLocal = LOCAL_HOSTS.has(req.nextUrl.hostname);
  if (!isLocal && !email) {
    return NextResponse.json({ error: "Sign in to manage API tokens." }, { status: 401 });
  }
  if (!(await hasFeatureForEmail("api_tokens", email))) {
    return NextResponse.json(
      { error: "API tokens are a Pro feature. Upgrade to script the review API." },
      { status: 402 },
    );
  }
  const { id } = await params;
  const token = await prisma.apiToken.findUnique({ where: { id } });
  if (!token) {
    return NextResponse.json({ error: "Token not found." }, { status: 404 });
  }
  // Ownership check: on a hosted deploy a signed-in user may only revoke their
  // own tokens (404, not 403, so token existence isn't revealed). Local installs
  // (no email) are the single machine owner and may manage any token.
  if (!isLocal && token.email !== email) {
    return NextResponse.json({ error: "Token not found." }, { status: 404 });
  }
  await prisma.apiToken.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
