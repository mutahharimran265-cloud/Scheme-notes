import type { Comment } from "@prisma/client";
import { hashToken } from "./auth";
import type { CommentDTO, ThreadDTO } from "./types";

/** Convert a Prisma Comment to a client-safe DTO. Never leaks authorToken. */
export function toCommentDTO(c: Comment, viewerToken?: string | null): CommentDTO {
  return {
    id: c.id,
    authorName: c.authorName,
    body: c.body,
    xPercent: c.xPercent,
    yPercent: c.yPercent,
    resolved: c.resolved,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    status: c.status,
    // Stored token is a SHA-256 hash; hash the viewer's raw token to compare.
    isOwn: Boolean(
      viewerToken && c.authorToken && c.authorToken === hashToken(viewerToken),
    ),
  };
}

export function toThreadDTO(
  thread: Comment & { replies: Comment[] },
  viewerToken?: string | null,
): ThreadDTO {
  return {
    ...toCommentDTO(thread, viewerToken),
    replies: thread.replies.map((r) => toCommentDTO(r, viewerToken)),
  };
}

// Input limits — enforced on every write path.
export const LIMITS = {
  name: 60,
  body: 4000,
} as const;

import { sanitizeHtml } from "./sanitize";

export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return sanitizeHtml(value).trim().slice(0, max);
}

export function isPercent(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}
