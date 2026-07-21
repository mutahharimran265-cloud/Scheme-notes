// Access control for team workspaces.
//
// Public projects keep SchemNotes' link-share model: anyone with the link can
// view and comment, no account needed. A project becomes *private* when it's
// attached to a team (or its visibility is set to "private") — then access is
// governed by team membership + per-project ProjectMember levels.
import { prisma } from "./prisma";

export type Capability = "none" | "view" | "comment" | "admin";

const CAP_RANK: Record<Capability, number> = { none: 0, view: 1, comment: 2, admin: 3 };
export function atLeast(cap: Capability, needed: Capability): boolean {
  return CAP_RANK[cap] >= CAP_RANK[needed];
}

// Per-project explicit grant → capability.
const LEVEL_CAP: Record<string, Capability> = {
  viewer: "view",
  commenter: "comment",
  admin: "admin",
};

export type TeamRole = "owner" | "admin" | "member";

type ProjectAccessFields = {
  id: string;
  ownerEmail: string | null;
  teamId: string | null;
  visibility: string;
};

/** Whether a project is restricted (members-only) vs public link-share. */
export function isPrivateProject(p: { teamId: string | null; visibility: string }): boolean {
  return p.visibility === "private" || p.teamId !== null;
}

/** The capability `email` (or anonymous when null) has on a project. */
export async function projectCapability(
  project: ProjectAccessFields,
  email: string | null,
): Promise<Capability> {
  // Public project → link-share: anyone can view + comment (current behaviour).
  if (!isPrivateProject(project)) return "comment";

  if (!email) return "none"; // private project requires a signed-in member
  if (project.ownerEmail && project.ownerEmail === email) return "admin";

  // Explicit per-project grant wins over the base team role.
  const pm = await prisma.projectMember.findUnique({
    where: { projectId_email: { projectId: project.id, email } },
    select: { level: true },
  });
  if (pm) return LEVEL_CAP[pm.level] ?? "none";

  // Otherwise fall back to the base team role, if any.
  if (project.teamId) {
    const tm = await prisma.teamMember.findUnique({
      where: { teamId_email: { teamId: project.teamId, email } },
      select: { role: true },
    });
    if (tm) return tm.role === "owner" || tm.role === "admin" ? "admin" : "comment";
  }
  return "none";
}

/** Load a project's access-relevant fields and compute the caller's capability. */
export async function loadProjectAccess(
  projectId: string,
  email: string | null,
): Promise<{ project: ProjectAccessFields | null; capability: Capability }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerEmail: true, teamId: true, visibility: true },
  });
  if (!project) return { project: null, capability: "none" };
  return { project, capability: await projectCapability(project, email) };
}

/** Resolve capability for the project a schematic file belongs to. */
export async function fileCapability(
  schematicFileId: string,
  email: string | null,
): Promise<Capability> {
  const file = await prisma.schematicFile.findUnique({
    where: { id: schematicFileId },
    select: { project: { select: { id: true, ownerEmail: true, teamId: true, visibility: true } } },
  });
  if (!file) return "none";
  return projectCapability(file.project, email);
}

/** The caller's role in a team (or null if not a member). */
export async function teamRole(teamId: string, email: string | null): Promise<TeamRole | null> {
  if (!email) return null;
  const tm = await prisma.teamMember.findUnique({
    where: { teamId_email: { teamId, email } },
    select: { role: true },
  });
  return (tm?.role as TeamRole | undefined) ?? null;
}

/** Owner/admin may manage a team (invite, remove, share projects). */
export function canManageTeam(role: TeamRole | null): boolean {
  return role === "owner" || role === "admin";
}

/**
 * The set of emails (lower-cased) that already have access to a project: its
 * owner, per-project members, and — if it's attached to a team — team members.
 * Used to gate @mention notifications so the app can only email people who are
 * already part of the project, never arbitrary addresses from a comment body
 * (which would turn the notification into a spam/phishing relay).
 */
export async function projectMemberEmails(project: {
  id: string;
  ownerEmail: string | null;
  teamId: string | null;
}): Promise<Set<string>> {
  const emails = new Set<string>();
  if (project.ownerEmail) emails.add(project.ownerEmail.toLowerCase());

  const members = await prisma.projectMember.findMany({
    where: { projectId: project.id },
    select: { email: true },
  });
  for (const m of members) emails.add(m.email.toLowerCase());

  if (project.teamId) {
    const team = await prisma.teamMember.findMany({
      where: { teamId: project.teamId },
      select: { email: true },
    });
    for (const m of team) emails.add(m.email.toLowerCase());
  }
  return emails;
}
