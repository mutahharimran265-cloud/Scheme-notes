import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";
import { storeSchematicUpload, UploadError } from "@/lib/uploads";
import { isOutstanding } from "@/lib/status";

export const runtime = "nodejs";

// POST /api/projects/[id]/revisions
// Multipart: file, name, carryOver ("true" to copy outstanding comments from
// the latest revision into the new one, preserving pins + authorship).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const sessionEmail = await getSessionEmail();
  const identifier = req.headers.get("x-forwarded-for") || sessionEmail || "unknown";
  const { limited } = isRateLimited(`uploads:${identifier}`, 10, 60 * 1000);
  if (limited) {
    return NextResponse.json({ error: "Too many uploads. Please wait." }, { status: 429 });
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { files: { orderBy: { uploadedAt: "asc" }, take: 1 } },
      },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  // Owned projects: only the owner may add revisions. Ownerless (local-first)
  // projects stay open, like commenting.
  if (project.ownerEmail && project.ownerEmail !== sessionEmail) {
    return NextResponse.json(
      { error: "Only the project owner can add a revision." },
      { status: 403 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form upload." }, { status: 400 });
  }

  const name =
    sanitizeHtml(((form.get("name") as string | null) ?? "").trim()).slice(0, 40) ||
    `rev ${project.revisions.length + 1}`;
  const note =
    sanitizeHtml(((form.get("note") as string | null) ?? "").trim()).slice(0, 300) || null;
  const carryOver = (form.get("carryOver") as string | null) === "true";

  let stored;
  try {
    stored = await storeSchematicUpload(form.get("file"));
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const previousFile = project.revisions[0]?.files[0] ?? null;

  const result = await prisma.$transaction(async (tx) => {
    const revision = await tx.revision.create({
      data: { projectId: id, name, note },
    });
    const file = await tx.schematicFile.create({
      data: {
        projectId: id,
        revisionId: revision.id,
        fileUrl: stored.fileUrl,
        fileType: stored.servedType,
        originalUrl: stored.originalUrl,
        originalName: stored.originalName,
      },
    });

    let carried = 0;
    if (carryOver && previousFile) {
      const outstanding = await tx.comment.findMany({
        where: { schematicFileId: previousFile.id, parentCommentId: null },
        orderBy: { createdAt: "asc" },
      });
      for (const c of outstanding) {
        if (!isOutstanding(c)) continue;
        await tx.comment.create({
          data: {
            schematicFileId: file.id,
            authorName: c.authorName,
            authorToken: c.authorToken, // already hashed; original author keeps ownership
            body: c.body,
            xPercent: c.xPercent,
            yPercent: c.yPercent,
            status: c.status,
            resolved: false,
            tags: c.tags,
            componentRef: c.componentRef,
            partNumber: c.partNumber,
            datasheetUrl: c.datasheetUrl,
            carriedFromId: c.id,
          },
        });
        carried++;
      }
    }
    return { revisionId: revision.id, fileId: file.id, carried };
  });

  return NextResponse.json(result, { status: 201 });
}
