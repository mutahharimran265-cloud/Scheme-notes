import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { cleanText } from "@/lib/comments";
import { teamRole, canManageTeam } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/teams/[id] -> full details (members, pending invites, projects).
// Any member may read; management actions are checked per-endpoint below.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await teamRole(id, await getSessionEmail());
  if (!role) return NextResponse.json({ error: "Not a member of this team." }, { status: 403 });
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
        orderBy: { createdAt: "asc" },
        select: { email: true, role: true, createdAt: true },
      },
      invites: {
        where: { acceptedAt: null },
        orderBy: { createdAt: "asc" },
        select: { email: true, role: true, createdAt: true },
      },
      projects: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, visibility: true },
      },
    },
  });
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });
  return NextResponse.json({ team: { ...team, myRole: role } });
}

// PATCH /api/teams/[id] { name } -> rename (owner/admin).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await teamRole(id, await getSessionEmail());
  if (!canManageTeam(role)) {
    return NextResponse.json({ error: "Only an owner or admin can rename the team." }, { status: 403 });
  }
  const data = await req.json().catch(() => null);
  const name = cleanText(data?.name, 60);
  if (!name) return NextResponse.json({ error: "Enter a team name." }, { status: 400 });
  const team = await prisma.team.update({ where: { id }, data: { name } });
  return NextResponse.json({ team: { id: team.id, name: team.name } });
}

// DELETE /api/teams/[id] -> delete the team (owner only). Members + invites
// cascade; projects are detached (teamId -> null) rather than deleted.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await teamRole(id, await getSessionEmail());
  if (role !== "owner") {
    return NextResponse.json({ error: "Only the team owner can delete it." }, { status: 403 });
  }
  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
