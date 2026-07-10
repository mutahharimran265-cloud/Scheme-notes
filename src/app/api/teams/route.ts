import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { hasFeatureForEmail } from "@/lib/plan";
import { cleanText } from "@/lib/comments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Team workspaces are a Team-plan feature, resolved per signed-in account.
export async function requireTeamPlan(): Promise<{ email: string } | NextResponse> {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Sign in to use team workspaces." }, { status: 401 });
  }
  if (!(await hasFeatureForEmail("shared_workspaces", email))) {
    return NextResponse.json(
      { error: "Team workspaces are a Team-plan feature." },
      { status: 402 },
    );
  }
  return { email };
}

// GET /api/teams -> the teams the signed-in user belongs to (role + counts).
export async function GET() {
  const g = await requireTeamPlan();
  if (g instanceof NextResponse) return g;
  const memberships = await prisma.teamMember.findMany({
    where: { email: g.email },
    orderBy: { createdAt: "asc" },
    include: { team: { include: { _count: { select: { members: true, projects: true } } } } },
  });
  const teams = memberships.map((m) => ({
    id: m.team.id,
    name: m.team.name,
    role: m.role,
    members: m.team._count.members,
    projects: m.team._count.projects,
    createdAt: m.team.createdAt,
  }));
  return NextResponse.json({ teams });
}

// POST /api/teams { name } -> create a team; the caller becomes its owner.
export async function POST(req: NextRequest) {
  const g = await requireTeamPlan();
  if (g instanceof NextResponse) return g;
  const data = await req.json().catch(() => null);
  const name = cleanText(data?.name, 60);
  if (!name) return NextResponse.json({ error: "Enter a team name." }, { status: 400 });
  const team = await prisma.team.create({
    data: { name, members: { create: { email: g.email, role: "owner" } } },
  });
  return NextResponse.json({ team: { id: team.id, name: team.name } }, { status: 201 });
}
