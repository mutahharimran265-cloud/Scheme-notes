import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";
import { storeSchematicUpload, UploadError } from "@/lib/uploads";
import { hasFeatureForEmail } from "@/lib/plan";

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

  // Rendering native KiCad (.kicad_sch) is a Pro feature; PNG/JPG/PDF/SVG stay
  // free. Set SCHEMNOTES_PLAN=pro (or upgrade the account) to unlock.
  const upload = form.get("file");
  const ext =
    upload instanceof File ? upload.name.split(".").pop()?.toLowerCase() : undefined;
  if (ext === "kicad_sch" && !(await hasFeatureForEmail("kicad_rendering", sessionEmail))) {
    return NextResponse.json(
      {
        error:
          "Native KiCad (.kicad_sch) rendering is a Pro feature. Upgrade, or upload a PDF/SVG export.",
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
