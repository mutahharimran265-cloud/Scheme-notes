import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";
import { storeSchematicUpload, UploadError } from "@/lib/uploads";
import { uploadAllowance } from "@/lib/plan";

// File writes + kicad-cli need the Node.js runtime (not Edge).
export const runtime = "nodejs";

// POST /api/upload -> create a project with its schematic file.
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form upload." }, { status: 400 });
  }

  const rawTitle = (form.get("title") as string | null)?.trim() || "Untitled schematic";
  const title = sanitizeHtml(rawTitle).slice(0, 100);
  const sessionEmail = await getSessionEmail();
  const ownerEmail =
    sessionEmail ?? (form.get("ownerEmail") as string | null)?.trim() ?? null;

  const identifier = req.headers.get("x-forwarded-for") || sessionEmail || "unknown";
  const { limited } = isRateLimited(`uploads:${identifier}`, 10, 60 * 1000);
  if (limited) {
    return NextResponse.json({ error: "Too many uploads. Please wait." }, { status: 429 });
  }

  // Free tier is capped by volume (uploads/month); paid plans are unlimited.
  // Every file format — including native KiCad — is available on all plans.
  const { allowed, used, limit } = await uploadAllowance(sessionEmail);
  if (!allowed) {
    return NextResponse.json(
      {
        error: `You've used all ${limit} free uploads this month (${used}/${limit}). Upgrade to Pro for unlimited uploads.`,
      },
      { status: 402 },
    );
  }

  let stored;
  try {
    stored = await storeSchematicUpload(form.get("file"));
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const project = await prisma.project.create({
    data: {
      title,
      ownerEmail,
      files: {
        create: {
          fileUrl: stored.fileUrl,
          fileType: stored.servedType,
          originalUrl: stored.originalUrl,
          originalName: stored.originalName,
        },
      },
    },
  });

  return NextResponse.json(
    { projectId: project.id, url: `/project/${project.id}` },
    { status: 201 },
  );
}
