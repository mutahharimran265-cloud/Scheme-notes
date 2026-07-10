import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { hasFeatureForEmail } from "@/lib/plan";
import { fileCapability, atLeast } from "@/lib/access";

export const runtime = "nodejs";

// GET /api/comments/[id]/versions -> the edit history of a comment (newest
// first). Viewing history is the Pro `version_history` feature; edits are
// always recorded server-side regardless of plan.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const email = await getSessionEmail();

  // Object-level access first: you may only read history for a comment on a
  // schematic you can view. Public projects grant view to anyone with the link;
  // private/team projects require membership. Without this, any caller who
  // passes the plan gate below could read any comment's history by id.
  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { schematicFileId: true },
  });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }
  if (!atLeast(await fileCapability(comment.schematicFileId, email), "view")) {
    return NextResponse.json(
      { error: "You don't have access to this schematic." },
      { status: 403 },
    );
  }

  if (!(await hasFeatureForEmail("version_history", email))) {
    return NextResponse.json(
      { error: "Viewing edit history is a Pro feature." },
      { status: 402 },
    );
  }
  const versions = await prisma.commentVersion.findMany({
    where: { commentId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, body: true, editedBy: true, createdAt: true },
  });
  return NextResponse.json({ versions });
}
