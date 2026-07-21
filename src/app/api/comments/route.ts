import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken, getSessionEmail } from "@/lib/auth";
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
import { fileCapability, projectCapability, atLeast, projectMemberEmails } from "@/lib/access";
import { extractMentionEmails } from "@/lib/mentions";
import { isEmailConfigured, sendMentionNotification } from "@/lib/mailer";

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

  // Rate-limit comment creation, keyed by the per-browser author token (falling
  // back to IP). Applies to every request — there is no bypass.
  const identifier =
    req.headers.get("x-author-token") || req.headers.get("x-forwarded-for") || "unknown";
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

  const file = await prisma.schematicFile.findUnique({
    where: { id: schematicFileId },
    include: {
      project: { select: { id: true, title: true, ownerEmail: true, teamId: true, visibility: true } },
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

  // Best-effort @mention notifications — only when SMTP is configured, and never
  // block or fail the comment if email delivery has a problem. SECURITY: only
  // notify emails that already have access to this project (owner / project
  // members / team members). Emailing arbitrary addresses parsed from a comment
  // body would turn this into an open spam/phishing relay from our domain.
  const mentions = extractMentionEmails(body);
  if (mentions.length && isEmailConfigured()) {
    const allowed = await projectMemberEmails(file.project);
    const recipients = mentions.filter((m) => allowed.has(m.toLowerCase()));
    if (recipients.length) {
      const origin = process.env.APP_ORIGIN?.trim() || req.nextUrl.origin;
      const focusId = created.parentCommentId ?? created.id;
      const link = `${origin}/project/${file.project.id}?focus=${focusId}`;
      const snippet = body.length > 140 ? body.slice(0, 140) + "…" : body;
      try {
        await Promise.allSettled(
          recipients.map((to) =>
            sendMentionNotification(to, {
              projectTitle: file.project.title,
              author: authorName,
              link,
              snippet,
            }),
          ),
        );
      } catch {
        /* notifications are best-effort */
      }
    }
  }

  return NextResponse.json({ comment: toCommentDTO(created, authorToken) }, { status: 201 });
}
