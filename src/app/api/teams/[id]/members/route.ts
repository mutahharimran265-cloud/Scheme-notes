import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSessionEmail, normalizeEmail, isValidEmail } from "@/lib/auth";
import { teamRole, canManageTeam } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/teams/[id]/members { email, role } -> invite a member (owner/admin).
// Creates a pending invite and returns a copyable accept link (no SMTP needed;
// the app also emails it when SMTP is configured elsewhere).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getSessionEmail();
  if (!canManageTeam(await teamRole(id, actor))) {
    return NextResponse.json({ error: "Only an owner or admin can invite members." }, { status: 403 });
  }
  const data = await req.json().catch(() => null);
  const email = normalizeEmail(typeof data?.email === "string" ? data.email : "");
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const role = data?.role === "admin" ? "admin" : "member";

  if (await prisma.teamMember.findUnique({ where: { teamId_email: { teamId: id, email } } })) {
    return NextResponse.json({ error: "That person is already a member." }, { status: 409 });
  }

  const token = randomBytes(24).toString("base64url");
  await prisma.teamInvite.upsert({
    where: { teamId_email: { teamId: id, email } },
    create: { teamId: id, email, role, token, invitedBy: actor! },
    update: { role, token, invitedBy: actor!, acceptedAt: null },
  });
  const origin = process.env.APP_ORIGIN?.trim() || req.nextUrl.origin;
  const inviteUrl = `${origin}/teams/accept?token=${encodeURIComponent(token)}`;
  return NextResponse.json({ ok: true, email, role, inviteUrl }, { status: 201 });
}
