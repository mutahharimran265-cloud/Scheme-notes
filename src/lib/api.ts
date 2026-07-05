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
  // The API pages at 100 threads; aggregate every page so large reviews
  // (100+ annotations) never silently truncate.
  const limit = 100;
  const all: ThreadDTO[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await fetch(
      `/api/comments?fileId=${encodeURIComponent(fileId)}&page=${page}&limit=${limit}`,
      { headers: { "x-author-token": getAuthorToken() }, cache: "no-store" },
    );
    const data = await parse(res);
    const batch = data.threads as ThreadDTO[];
    all.push(...batch);
    if (batch.length < limit) break;
  }
  return all;
}

export async function createThread(input: {
  schematicFileId: string;
  authorName: string;
  body: string;
  xPercent: number;
  yPercent: number;
  tags?: string[];
  componentRef?: string;
  partNumber?: string;
  datasheetUrl?: string;
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

export type { CommentStatus } from "./status";
import type { CommentStatus } from "./status";

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

export async function createRevision(
  projectId: string,
  input: { file: File; name: string; note?: string; carryOver: boolean },
): Promise<{ revisionId: string; fileId: string; carried: number }> {
  const fd = new FormData();
  fd.append("file", input.file);
  fd.append("name", input.name);
  if (input.note) fd.append("note", input.note);
  fd.append("carryOver", String(input.carryOver));
  const res = await fetch(`/api/projects/${projectId}/revisions`, {
    method: "POST",
    body: fd,
  });
  return (await parse(res)) as { revisionId: string; fileId: string; carried: number };
}
