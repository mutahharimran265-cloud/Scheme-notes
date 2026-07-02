import { getAuthorToken } from "./identity";
import type { CommentDTO, ThreadDTO } from "./types";

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function authHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", "x-author-token": getAuthorToken() };
}

export async function fetchThreads(fileId: string): Promise<ThreadDTO[]> {
  const res = await fetch(`/api/comments?fileId=${encodeURIComponent(fileId)}`, {
    headers: { "x-author-token": getAuthorToken() },
    cache: "no-store",
  });
  const data = await parse(res);
  return data.threads as ThreadDTO[];
}

export async function createThread(input: {
  schematicFileId: string;
  authorName: string;
  body: string;
  xPercent: number;
  yPercent: number;
}): Promise<CommentDTO> {
  const res = await fetch("/api/comments", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ...input, authorToken: getAuthorToken() }),
  });
  return (await parse(res)).comment as CommentDTO;
}

export async function createReply(input: {
  schematicFileId: string;
  parentCommentId: string;
  authorName: string;
  body: string;
}): Promise<CommentDTO> {
  const res = await fetch("/api/comments", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ...input, authorToken: getAuthorToken() }),
  });
  return (await parse(res)).comment as CommentDTO;
}

export type CommentStatus = "open" | "resolved" | "wontfix";

export async function setStatus(
  id: string,
  status: CommentStatus,
): Promise<CommentDTO> {
  const res = await fetch(`/api/comments/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  return (await parse(res)).comment as CommentDTO;
}

export async function editComment(id: string, body: string): Promise<CommentDTO> {
  const res = await fetch(`/api/comments/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ body }),
  });
  return (await parse(res)).comment as CommentDTO;
}

export async function deleteComment(id: string): Promise<void> {
  const res = await fetch(`/api/comments/${id}`, {
    method: "DELETE",
    headers: { "x-author-token": getAuthorToken() },
  });
  await parse(res);
}

export async function updateProject(id: string, title: string): Promise<{ id: string; title: string }> {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const data = await parse(res);
  return data.project;
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, {
    method: "DELETE",
  });
  await parse(res);
}
