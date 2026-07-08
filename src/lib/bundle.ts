// Workspace bundle — the unit of cloud sync. Serializes one account's projects,
// files, comments, and referenced upload blobs into JSON, and applies a bundle
// with replace-semantics (the account's workspace becomes exactly the bundle).
// Simple and predictable: last push wins, no field-level merge.

import path from "node:path";
import { prisma } from "./prisma";
import { putFile, readStored, contentTypeFor } from "./storage";

export type BundleComment = {
  id: string;
  parentCommentId: string | null;
  authorName: string;
  authorToken: string | null;
  body: string;
  xPercent: number | null;
  yPercent: number | null;
  pageNumber: number;
  status: string;
  resolved: boolean;
  tags: string;
  componentRef: string | null;
  partNumber: string | null;
  datasheetUrl: string | null;
  createdAt: string;
};

export type BundleFile = {
  id: string;
  fileUrl: string;
  fileType: string;
  originalUrl: string | null;
  originalName: string | null;
  uploadedAt: string;
  comments: BundleComment[];
};

export type BundleProject = {
  id: string;
  title: string;
  createdAt: string;
  files: BundleFile[];
};

export type SyncBundle = {
  app: "SchemNotes";
  formatVersion: 3;
  exportedAt: string;
  projects: BundleProject[];
  blobs: Record<string, string>; // basename -> base64
};

/** Serialize everything owned by `email` into a self-contained bundle. */
export async function buildOwnerBundle(email: string): Promise<SyncBundle> {
  const projects = await prisma.project.findMany({
    where: { ownerEmail: email },
    orderBy: { createdAt: "asc" },
    include: {
      files: {
        orderBy: { uploadedAt: "asc" },
        include: { comments: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  const hrefs = new Map<string, string>(); // basename -> href
  const add = (href?: string | null) => {
    if (href) hrefs.set(path.basename(href.split("?")[0]), href);
  };
  for (const p of projects) {
    for (const f of p.files) {
      add(f.fileUrl);
      add(f.originalUrl);
      for (const c of f.comments) {
        for (const m of c.body.matchAll(
          /\]\((https?:\/\/[^\s)]*\/uploads\/[^)\s]+|\/uploads\/[^)\s]+)\)/g,
        )) {
          add(m[1]);
        }
      }
    }
  }

  const blobs: Record<string, string> = {};
  for (const [name, href] of hrefs) {
    const bytes = await readStored(href);
    if (bytes) blobs[name] = bytes.toString("base64");
  }

  // JSON.stringify turns Date fields into ISO strings; that's what BundleX expects.
  return {
    app: "SchemNotes",
    formatVersion: 3,
    exportedAt: new Date().toISOString(),
    projects: JSON.parse(JSON.stringify(projects)) as BundleProject[],
    blobs,
  };
}

function commentCreate(c: BundleComment, fileId: string) {
  return {
    id: c.id,
    schematicFileId: fileId,
    parentCommentId: c.parentCommentId ?? null,
    authorName: c.authorName,
    authorToken: c.authorToken ?? null,
    body: c.body,
    xPercent: c.xPercent ?? null,
    yPercent: c.yPercent ?? null,
    pageNumber: c.pageNumber ?? 1,
    status: c.status ?? "open",
    resolved: Boolean(c.resolved),
    tags: c.tags ?? "[]",
    componentRef: c.componentRef ?? null,
    partNumber: c.partNumber ?? null,
    datasheetUrl: c.datasheetUrl ?? null,
    carriedFromId: null, // deprecated field — never carried across sync
    createdAt: new Date(c.createdAt),
  };
}

/**
 * Replace `email`'s workspace with `bundle`. Writes referenced blobs, then in a
 * transaction deletes the account's projects and recreates them from the bundle
 * (ids preserved, so repeated syncs are idempotent).
 */
export async function applyOwnerBundle(
  email: string,
  bundle: SyncBundle,
): Promise<{ projects: number; comments: number }> {
  // Materialize blobs into this instance's storage, mapping each basename to
  // the href it now lives at (local /uploads/… or a Blob URL).
  const newHref: Record<string, string> = {};
  for (const [name, b64] of Object.entries(bundle.blobs ?? {})) {
    const base = path.basename(name);
    newHref[base] = await putFile(base, Buffer.from(b64, "base64"), contentTypeFor(base));
  }
  const remap = (href: string): string =>
    /^https?:\/\//i.test(href) ? href : (newHref[path.basename(href)] ?? href);
  const remapBody = (body: string): string =>
    body.replace(/\/uploads\/[A-Za-z0-9._-]+/g, (m) => newHref[path.basename(m)] ?? m);

  let comments = 0;
  await prisma.$transaction(
    async (tx) => {
      await tx.project.deleteMany({ where: { ownerEmail: email } });
      for (const p of bundle.projects) {
        await tx.project.create({
          data: { id: p.id, title: p.title, ownerEmail: email, createdAt: new Date(p.createdAt) },
        });
        for (const f of p.files) {
          await tx.schematicFile.create({
            data: {
              id: f.id,
              projectId: p.id,
              fileUrl: remap(f.fileUrl),
              fileType: f.fileType,
              originalUrl: f.originalUrl ? remap(f.originalUrl) : null,
              originalName: f.originalName ?? null,
              uploadedAt: new Date(f.uploadedAt),
            },
          });
          // Roots (top-level threads) before replies so the parent FK resolves.
          const roots = f.comments.filter((c) => !c.parentCommentId);
          const replies = f.comments.filter((c) => c.parentCommentId);
          for (const c of [...roots, ...replies]) {
            await tx.comment.create({
              data: { ...commentCreate(c, f.id), body: remapBody(c.body) },
            });
            comments++;
          }
        }
      }
    },
    { timeout: 30_000 },
  );

  return { projects: bundle.projects.length, comments };
}
