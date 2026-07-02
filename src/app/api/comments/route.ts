import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth";
import { toThreadDTO, toCommentDTO, cleanText, isPercent, LIMITS } from "@/lib/comments";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTHOR_TOKEN_HEADER = "x-author-token";

// GET /api/comments?fileId=... -> threads (top-level comments + replies)
export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("fileId");
  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId." }, { status: 400 });
  }
  const viewerToken = req.headers.get(AUTHOR_TOKEN_HEADER);

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "100", 10)));
  const skip = (page - 1) * limit;

  const threads = await prisma.comment.findMany({
    where: { schematicFileId: fileId, parentCommentId: null },
    orderBy: { createdAt: "asc" },
    skip,
    take: limit,
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({
    threads: threads.map((t) => toThreadDTO(t, viewerToken)),
    page,
    limit,
  });
}

// POST /api/comments -> create a thread (with pin) or a reply
export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => null);
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const identifier = req.headers.get("x-author-token") || req.headers.get("x-forwarded-for") || "unknown";
  const { limited } = isRateLimited(`comments:${identifier}`, 30, 60 * 1000);
  if (limited) {
    return NextResponse.json({ error: "Too many comments. Please wait." }, { status: 429 });
  }

  const schematicFileId = cleanText(data.schematicFileId, 60);
  const authorName = cleanText(data.authorName, LIMITS.name);
  const body = cleanText(data.body, LIMITS.body);
  const authorToken = cleanText(data.authorToken, 200) || null;
  const parentCommentId = data.parentCommentId
    ? cleanText(data.parentCommentId, 60)
    : null;

  if (!schematicFileId) {
    return NextResponse.json({ error: "Missing schematicFileId." }, { status: 400 });
  }
  if (!authorName) {
    return NextResponse.json({ error: "A display name is required." }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
  }

  const file = await prisma.schematicFile.findUnique({ where: { id: schematicFileId } });
  if (!file) {
    return NextResponse.json({ error: "Schematic not found." }, { status: 404 });
  }

  // Reply: attach to the ROOT of the referenced thread (keep threads two levels deep).
  let rootParentId: string | null = null;
  if (parentCommentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentCommentId } });
    if (!parent || parent.schematicFileId !== schematicFileId) {
      return NextResponse.json({ error: "Parent comment not found." }, { status: 404 });
    }
    rootParentId = parent.parentCommentId ?? parent.id;
  }

  // Thread roots must carry a valid pin location; replies must not.
  let xPercent: number | null = null;
  let yPercent: number | null = null;
  if (!rootParentId) {
    if (!isPercent(data.xPercent) || !isPercent(data.yPercent)) {
      return NextResponse.json(
        { error: "A pin location (0-100%) is required for a new comment." },
        { status: 400 },
      );
    }
    xPercent = data.xPercent;
    yPercent = data.yPercent;
  }

  const created = await prisma.comment.create({
    data: {
      schematicFileId,
      parentCommentId: rootParentId,
      authorName,
      authorToken: authorToken ? hashToken(authorToken) : null,
      body,
      xPercent,
      yPercent,
    },
  });

  return NextResponse.json({ comment: toCommentDTO(created, authorToken) }, { status: 201 });
}
