import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken, getSessionEmail } from "@/lib/auth";
import { toCommentDTO, cleanText, LIMITS } from "@/lib/comments";
import { fileCapability, atLeast } from "@/lib/access";

export const runtime = "nodejs";

const AUTHOR_TOKEN_HEADER = "x-author-token";

// PATCH /api/comments/[id]
//  - { resolved: boolean }  -> collaborative, anyone with the link may toggle
//  - { body: string }       -> edit, requires matching authorToken
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await req.json().catch(() => null);
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  // Access control: updating a comment on a private/team schematic requires
  // commenter+ membership. Public projects grant this to anyone with the link,
  // so the collaborative status workflow is unchanged there; on a private
  // project it stops an outsider who guessed a comment id from flipping status.
  const sessionEmail = await getSessionEmail();
  if (!atLeast(await fileCapability(comment.schematicFileId, sessionEmail), "comment")) {
    return NextResponse.json(
      { error: "You don't have permission to update this comment." },
      { status: 403 },
    );
  }

  const patch: { resolved?: boolean; body?: string; status?: string } = {};

  // Status workflow (collaborative — anyone with the link may change it).
  // Keep the legacy `resolved` boolean in sync so older clients keep working;
  // "in review" is outstanding, so it is NOT resolved.
  const VALID_STATUS = ["open", "in_review", "resolved", "wontfix"];
  if (typeof data.status === "string" && VALID_STATUS.includes(data.status)) {
    patch.status = data.status;
    patch.resolved = data.status === "resolved" || data.status === "wontfix";
  } else if (typeof data.resolved === "boolean") {
    patch.resolved = data.resolved;
    patch.status = data.resolved ? "resolved" : "open";
  }

  if (typeof data.body === "string") {
    const token = req.headers.get(AUTHOR_TOKEN_HEADER);
    const hashed = token ? hashToken(token) : null;
    if (!comment.authorToken || comment.authorToken !== hashed) {
      return NextResponse.json(
        { error: "You can only edit your own comments." },
        { status: 403 },
      );
    }
    const body = cleanText(data.body, LIMITS.body);
    if (!body) {
      return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
    }
    patch.body = body;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  // Snapshot the prior body into the edit history before an edit lands, so the
  // change is auditable (viewing that history is the Pro version_history feature).
  let updated;
  if (patch.body !== undefined && patch.body !== comment.body) {
    const [, u] = await prisma.$transaction([
      prisma.commentVersion.create({
        data: { commentId: id, body: comment.body, editedBy: sessionEmail ?? comment.authorName },
      }),
      prisma.comment.update({ where: { id }, data: patch }),
    ]);
    updated = u;
  } else {
    updated = await prisma.comment.update({ where: { id }, data: patch });
  }
  return NextResponse.json({
    comment: toCommentDTO(updated, req.headers.get(AUTHOR_TOKEN_HEADER)),
  });
}

// DELETE /api/comments/[id] -> requires matching authorToken.
// Deleting a thread root removes its replies too.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.headers.get(AUTHOR_TOKEN_HEADER);

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }
  const hashed = token ? hashToken(token) : null;
  if (!comment.authorToken || comment.authorToken !== hashed) {
    return NextResponse.json(
      { error: "You can only delete your own comments." },
      { status: 403 },
    );
  }

  if (comment.parentCommentId === null) {
    // Thread root: drop replies first, then the root.
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { parentCommentId: id } }),
      prisma.comment.delete({ where: { id } }),
    ]);
  } else {
    await prisma.comment.delete({ where: { id } });
  }

  return NextResponse.json({ ok: true });
}
