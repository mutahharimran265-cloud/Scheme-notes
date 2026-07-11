import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { readStored } from "@/lib/storage";
import { projectCapability, atLeast } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

// Client-safe comment shape for the export. Deliberately a hand-picked list —
// never raw DB rows — so internal fields (authorToken hashes, owner email,
// team wiring) can't leak into a file that gets passed around.
type ExportComment = {
  id: string;
  author: string;
  body: string;
  status: string;
  resolved: boolean;
  xPercent: number | null;
  yPercent: number | null;
  tags: string[];
  componentRef: string | null;
  partNumber: string | null;
  datasheetUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  replies: Omit<ExportComment, "replies" | "xPercent" | "yPercent" | "tags" | "componentRef" | "partNumber" | "datasheetUrl">[];
};

function safeParseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

// GET /api/export?projectId=<id> -> a zip of ONE project: its schematic
// file(s), the comments (threads with replies), and a small README. There is
// deliberately no "export everything" mode — an export is something you hand
// to other people, so it must only ever contain the project you chose.
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "Pass ?projectId= — exports are per-project." },
      { status: 400 },
    );
  }

  const isLocal = LOCAL_HOSTS.has(req.nextUrl.hostname);
  const email = await getSessionEmail();

  const access = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerEmail: true, teamId: true, visibility: true },
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  // Anyone who can view the project may export it; private/team projects
  // require a member. (Local installs are the machine owner.)
  if (!isLocal && !atLeast(await projectCapability(access, email), "view")) {
    return NextResponse.json({ error: "You don't have access to this project." }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      createdAt: true,
      files: {
        orderBy: { uploadedAt: "asc" },
        select: {
          id: true,
          fileUrl: true,
          fileType: true,
          originalUrl: true,
          originalName: true,
          uploadedAt: true,
          comments: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  // Shape comments as threads with nested replies, whitelisting fields.
  const files = project.files.map((f) => {
    const roots = f.comments.filter((c) => c.parentCommentId === null);
    const threads: ExportComment[] = roots.map((c) => ({
      id: c.id,
      author: c.authorName,
      body: c.body,
      status: c.status,
      resolved: c.resolved,
      xPercent: c.xPercent,
      yPercent: c.yPercent,
      tags: safeParseTags(c.tags),
      componentRef: c.componentRef,
      partNumber: c.partNumber,
      datasheetUrl: c.datasheetUrl,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      replies: f.comments
        .filter((r) => r.parentCommentId === c.id)
        .map((r) => ({
          id: r.id,
          author: r.authorName,
          body: r.body,
          status: r.status,
          resolved: r.resolved,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
    }));
    return {
      fileName: path.basename(f.fileUrl.split("?")[0]),
      fileType: f.fileType,
      originalName: f.originalName,
      uploadedAt: f.uploadedAt,
      threads,
    };
  });

  const zip = new JSZip();
  zip.file(
    "data.json",
    JSON.stringify(
      {
        app: "SchemNotes",
        formatVersion: 4, // v4: single-project, sanitized (no internal fields)
        exportedAt: new Date().toISOString(),
        project: { title: project.title, createdAt: project.createdAt },
        files,
      },
      null,
      2,
    ),
  );

  const commentCount = files.reduce(
    (n, f) => n + f.threads.length + f.threads.reduce((m, t) => m + t.replies.length, 0),
    0,
  );
  zip.file(
    "README.txt",
    [
      `SchemNotes export — "${project.title}"`,
      `Exported ${new Date().toISOString()}`,
      "",
      "Contents:",
      "  data.json      the review — comment threads, replies, pin positions, statuses",
      "  schematics/    the schematic file(s) for this project",
      "  uploads/       images pasted into comments (if any)",
      "",
      `Comments included: ${commentCount}`,
      "Pin positions (xPercent/yPercent) are relative to the schematic image.",
    ].join("\n"),
  );

  // Bundle the schematic file(s) + originals + any images pasted into comments.
  const bundled = new Map<string, { href: string; dir: "schematics" | "uploads" }>();
  const add = (href: string | null | undefined, dir: "schematics" | "uploads") => {
    if (href) bundled.set(path.basename(href.split("?")[0]), { href, dir });
  };
  for (const f of project.files) {
    add(f.fileUrl, "schematics");
    add(f.originalUrl, "schematics");
    for (const c of f.comments) {
      for (const m of c.body.matchAll(
        /\]\((https?:\/\/[^\s)]*\/uploads\/[^)\s]+|\/uploads\/[^)\s]+)\)/g,
      )) {
        add(m[1], "uploads");
      }
    }
  }
  const missing: string[] = [];
  for (const [name, { href, dir }] of bundled) {
    const bytes = await readStored(href);
    if (bytes) zip.file(`${dir}/${name}`, bytes);
    else missing.push(name);
  }
  if (missing.length) zip.file("MISSING-FILES.txt", missing.join("\n"));

  const buf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const slug =
    project.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "project";
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="schemnotes-${slug}-${stamp}.zip"`,
      "Content-Length": String(buf.length),
    },
  });
}
