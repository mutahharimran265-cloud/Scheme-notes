import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { teamRole, canManageTeam, type TeamRole } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function manager(teamId: string, actor: string | null): Promise<TeamRole | null> {
  const role = await teamRole(teamId, actor);
  return canManageTeam(role) ? role : null;
}

// PATCH /api/teams/[id]/members/[email] { role } -> change a member's role.
// Only an owner may promote to or demote from "owner".
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; email: string }> },
) {
  const { id, email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail).toLowerCase();
  const actorRole = await manager(id, await getSessionEmail());
  if (!actorRole) {
    return NextResponse.json({ error: "Only an owner or admin can change roles." }, { status: 403 });
  }
  const data = await req.json().catch(() => null);
  const role = data?.role;
  if (!["owner", "admin", "member"].includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  const target = await prisma.teamMember.findUnique({
    where: { teamId_email: { teamId: id, email } },
    select: { role: true },
  });
  if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  if ((role === "owner" || target.role === "owner") && actorRole !== "owner") {
    return NextResponse.json({ error: "Only an owner can manage owners." }, { status: 403 });
  }
  await prisma.teamMember.update({
    where: { teamId_email: { teamId: id, email } },
    data: { role },
  });
  return NextResponse.json({ ok: true });
}

// DELETE /api/teams/[id]/members/[email] -> remove a member. A team must keep at
// least one owner; only an owner may remove another owner.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; email: string }> },
) {
  const { id, email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail).toLowerCase();
  const actorRole = await manager(id, await getSessionEmail());
  if (!actorRole) {
    return NextResponse.json({ error: "Only an owner or admin can remove members." }, { status: 403 });
  }
  const target = await prisma.teamMember.findUnique({
    where: { teamId_email: { teamId: id, email } },
    select: { role: true },
  });
  if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  if (target.role === "owner") {
    if (actorRole !== "owner") {
      return NextResponse.json({ error: "Only an owner can remove an owner." }, { status: 403 });
    }
    const owners = await prisma.teamMember.count({ where: { teamId: id, role: "owner" } });
    if (owners <= 1) {
      return NextResponse.json({ error: "A team must have at least one owner." }, { status: 400 });
    }
  }
  await prisma.teamMember.delete({ where: { teamId_email: { teamId: id, email } } });
  return NextResponse.json({ ok: true });
}
