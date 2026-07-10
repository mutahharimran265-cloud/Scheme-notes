import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { teamRole, canManageTeam } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProjectShare = { id: string; ownerEmail: string | null; teamId: string | null; visibility: string };

// The project owner, a per-project admin, or a team owner/admin may manage sharing.
async function requireShareAdmin(id: string, email: string | null): Promise<ProjectShare | null> {
  if (!email) return null;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, ownerEmail: true, teamId: true, visibility: true },
  });
  if (!project) return null;
  if (project.ownerEmail === email) return project;
  const pm = await prisma.projectMember.findUnique({
    where: { projectId_email: { projectId: id, email } },
    select: { level: true },
  });
  if (pm?.level === "admin") return project;
  if (project.teamId && canManageTeam(await teamRole(project.teamId, email))) return project;
  return null;
}

// GET /api/projects/[id]/share -> current sharing config (admins only).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await requireShareAdmin(id, await getSessionEmail());
  if (!project) {
    return NextResponse.json({ error: "Only the project owner or a team admin can manage sharing." }, { status: 403 });
  }
  const members = await prisma.projectMember.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
    select: { email: true, level: true },
  });
  return NextResponse.json({ visibility: project.visibility, teamId: project.teamId, members });
}

// PATCH /api/projects/[id]/share { visibility?, teamId?, members?: [{email, level, remove?}] }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = await getSessionEmail();
  const project = await requireShareAdmin(id, email);
  if (!project) {
    return NextResponse.json({ error: "Only the project owner or a team admin can manage sharing." }, { status: 403 });
  }
  const data = await req.json().catch(() => null);
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const update: { visibility?: string; teamId?: string | null } = {};
  if (data.visibility === "public" || data.visibility === "private") update.visibility = data.visibility;
  if (typeof data.teamId === "string" || data.teamId === null) {
    if (data.teamId && !canManageTeam(await teamRole(data.teamId, email))) {
      return NextResponse.json({ error: "You can't attach the project to that team." }, { status: 403 });
    }
    update.teamId = data.teamId;
    // Attaching to a team implies a private (members-only) project.
    if (data.teamId && update.visibility === undefined) update.visibility = "private";
  }
  if (Object.keys(update).length) {
    await prisma.project.update({ where: { id }, data: update });
  }

  // Per-project member levels: [{ email, level: viewer|commenter|admin, remove? }].
  if (Array.isArray(data.members)) {
    for (const m of data.members) {
      const memberEmail = typeof m?.email === "string" ? m.email.trim().toLowerCase() : "";
      if (!memberEmail) continue;
      if (m.remove === true) {
        await prisma.projectMember.deleteMany({ where: { projectId: id, email: memberEmail } });
        continue;
      }
      const level = ["viewer", "commenter", "admin"].includes(m.level) ? m.level : "commenter";
      await prisma.projectMember.upsert({
        where: { projectId_email: { projectId: id, email: memberEmail } },
        create: { projectId: id, email: memberEmail, level },
        update: { level },
      });
    }
  }
  return NextResponse.json({ ok: true });
}
