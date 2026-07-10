import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/teams/invites/accept { token } -> accept a pending invite. The
// signed-in email must match the invited email (prevents invite hijacking).
export async function POST(req: NextRequest) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Sign in to accept the invite." }, { status: 401 });

  const data = await req.json().catch(() => null);
  const token = typeof data?.token === "string" ? data.token : "";
  const invite = await prisma.teamInvite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt) {
    return NextResponse.json({ error: "This invite is invalid or has already been used." }, { status: 400 });
  }
  if (invite.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invite is for ${invite.email}. Sign in with that email to accept it.` },
      { status: 403 },
    );
  }

  await prisma.$transaction([
    prisma.teamMember.upsert({
      where: { teamId_email: { teamId: invite.teamId, email } },
      create: { teamId: invite.teamId, email, role: invite.role },
      update: { role: invite.role },
    }),
    prisma.teamInvite.update({ where: { token }, data: { acceptedAt: new Date() } }),
  ]);
  return NextResponse.json({ ok: true, teamId: invite.teamId });
}
