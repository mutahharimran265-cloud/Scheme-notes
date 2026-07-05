import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

// GET /api/export -> a zip of everything: data.json (projects, files, comments)
// plus every uploaded schematic file. This is the local-first escape hatch:
// your data is never locked in, independent of any cloud feature.
//
// Access: on a local install (localhost) it exports the whole database — it's
// the machine owner's data. When hosted, it requires a session and exports
// only that owner's projects.
export async function GET(req: NextRequest) {
  const isLocal = LOCAL_HOSTS.has(req.nextUrl.hostname);
  const email = await getSessionEmail();
  if (!isLocal && !email) {
    return NextResponse.json({ error: "Sign in to export your data." }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: isLocal ? {} : { ownerEmail: email },
    orderBy: { createdAt: "asc" },
    include: {
      revisions: {
        orderBy: { createdAt: "asc" },
        include: {
          files: {
            orderBy: { uploadedAt: "asc" },
            include: { comments: { orderBy: { createdAt: "asc" } } },
          },
        },
      },
      // Safety net: any file not yet attached to a revision (shouldn't happen
      // post-backfill, but never silently drop data from an export).
      files: {
        where: { revisionId: null },
        orderBy: { uploadedAt: "asc" },
        include: { comments: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  const zip = new JSZip();
  zip.file(
    "data.json",
    JSON.stringify(
      {
        app: "SchemNotes",
        formatVersion: 2, // v2: files nested under named revisions
        exportedAt: new Date().toISOString(),
        scope: isLocal ? "all-local-data" : `owner:${email}`,
        projects,
      },
      null,
      2,
    ),
  );

  // Bundle every referenced upload (rendered files + native originals).
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const wanted = new Set<string>();
  for (const p of projects) {
    const allFiles = [...p.files, ...p.revisions.flatMap((r) => r.files)];
    for (const f of allFiles) {
      if (f.fileUrl) wanted.add(path.basename(f.fileUrl));
      if (f.originalUrl) wanted.add(path.basename(f.originalUrl));
      // Images pasted into comment bodies (markdown) live in uploads too.
      for (const c of f.comments) {
        for (const m of c.body.matchAll(/\/uploads\/([A-Za-z0-9._-]+)/g)) {
          wanted.add(m[1]);
        }
      }
    }
  }
  const missing: string[] = [];
  for (const name of wanted) {
    const filePath = path.join(uploadsDir, name);
    if (existsSync(filePath)) {
      zip.file(`uploads/${name}`, await readFile(filePath));
    } else {
      missing.push(name);
    }
  }
  if (missing.length) {
    zip.file("MISSING-FILES.txt", missing.join("\n"));
  }

  const buf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="schemnotes-export-${stamp}.zip"`,
      "Content-Length": String(buf.length),
    },
  });
}
