import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken, getSessionEmail } from "@/lib/auth";
import { hasFeature } from "@/lib/entitlements";
import {
  toThreadDTO,
  toCommentDTO,
  cleanText,
  isPercent,
  parseTags,
  cleanUrl,
  LIMITS,
} from "@/lib/comments";
import { isRateLimited } from "@/lib/rate-limit";
import { parsePageParam } from "@/lib/pagination";
import { fileCapability, projectCapability, atLeast } from "@/lib/access";

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

  // Access control: private/team schematics require a member with view+ access.
  if (!atLeast(await fileCapability(fileId, await getSessionEmail()), "view")) {
    return NextResponse.json(
      { error: "You don't have access to this schematic." },
      { status: 403 },
    );
  }

  const page = parsePageParam(req.nextUrl.searchParams.get("page"), 1, 1, Number.MAX_SAFE_INTEGER);
  const limit = parsePageParam(req.nextUrl.searchParams.get("limit"), 100, 1, 100);
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

// POST /api/comments -> create a thread (with pin) or a reply.
// Scripts may authenticate with an API token (Authorization: Bearer sn_...):
// the token acts as the author identity and bypasses the rate limit.
export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => null);
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  let apiTokenSecret: string | null = null;
  if (bearer) {
    // Bearer auth is the scriptable-API path, which is a Pro feature.
    if (!hasFeature("api_tokens")) {
      return NextResponse.json(
        { error: "API tokens are a Pro feature. Upgrade to script the review API." },
        { status: 402 },
      );
    }
    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash: hashToken(bearer) },
    });
    if (!apiToken) {
      return NextResponse.json({ error: "Invalid API token." }, { status: 401 });
    }
    apiTokenSecret = bearer;
    await prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    });
  }

  if (!apiTokenSecret) {
    const identifier = req.headers.get("x-author-token") || req.headers.get("x-forwarded-for") || "unknown";
    const { limited } = isRateLimited(`comments:${identifier}`, 30, 60 * 1000);
    if (limited) {
      return NextResponse.json({ error: "Too many comments. Please wait." }, { status: 429 });
    }
  }

  const schematicFileId = cleanText(data.schematicFileId, 60);
  const authorName = cleanText(data.authorName, LIMITS.name);
  const body = cleanText(data.body, LIMITS.body);
  // An API token doubles as the author identity, so scripted comments can be
  // edited/deleted later using the same token.
  const authorToken = apiTokenSecret ?? (cleanText(data.authorToken, 200) || null);
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

  const file = await prisma.schematicFile.findUnique({
    where: { id: schematicFileId },
    include: {
      project: { select: { id: true, ownerEmail: true, teamId: true, visibility: true } },
    },
  });
  if (!file) {
    return NextResponse.json({ error: "Schematic not found." }, { status: 404 });
  }
  // Access control: public projects allow anyone to comment; private/team
  // projects require a member with commenter+ access.
  if (!atLeast(await projectCapability(file.project, await getSessionEmail()), "comment")) {
    return NextResponse.json(
      { error: "You don't have permission to comment on this schematic." },
      { status: 403 },
    );
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

  // Engineer metadata lives on thread roots only (replies inherit context).
  const tags = rootParentId ? [] : parseTags(data.tags);
  const componentRef = rootParentId ? null : cleanText(data.componentRef, 40) || null;
  const partNumber = rootParentId ? null : cleanText(data.partNumber, 80) || null;
  const datasheetUrl = rootParentId ? null : cleanUrl(data.datasheetUrl);

  const created = await prisma.comment.create({
    data: {
      schematicFileId,
      parentCommentId: rootParentId,
      authorName,
      authorToken: authorToken ? hashToken(authorToken) : null,
      body,
      xPercent,
      yPercent,
      tags: JSON.stringify(tags),
      componentRef,
      partNumber,
      datasheetUrl,
    },
  });

  return NextResponse.json({ comment: toCommentDTO(created, authorToken) }, { status: 201 });
}
