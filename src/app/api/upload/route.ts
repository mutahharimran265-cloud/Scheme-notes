import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { convertKicadSchToSvg } from "@/lib/kicad";
import { isRateLimited } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";

// File writes + kicad-cli need the Node.js runtime (not Edge).
export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const MIME_TO_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};

const EXT_TO_TYPE: Record<string, string> = {
  png: "png",
  jpg: "jpg",
  jpeg: "jpg",
  svg: "svg",
  pdf: "pdf",
  kicad_sch: "kicad_sch", // native KiCad schematic — rendered to SVG below
};

// Native EDA formats we can't render directly yet — give a tailored hint.
const UNSUPPORTED_NATIVE: Record<string, string> = {
  kicad_pcb:
    "PCB layouts aren't supported yet — upload the schematic (.kicad_sch) or a PDF/SVG export.",
  schdoc: "Altium files can't be rendered directly — please export a PDF or SVG.",
  pcbdoc: "Altium files can't be rendered directly — please export a PDF or SVG.",
  brd: "Board files can't be rendered directly — please export a PDF or SVG.",
  sch: "This looks like an Eagle/legacy schematic — please export a PDF or SVG.",
};

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form upload." }, { status: 400 });
  }

  const file = form.get("file");
  const rawTitle = (form.get("title") as string | null)?.trim() || "Untitled schematic";
  const title = sanitizeHtml(rawTitle);
  const sessionEmail = await getSessionEmail();
  const ownerEmail =
    sessionEmail ?? (form.get("ownerEmail") as string | null)?.trim() ?? null;

  const identifier = req.headers.get("x-forwarded-for") || sessionEmail || "unknown";
  const { limited } = isRateLimited(`uploads:${identifier}`, 10, 60 * 1000);
  if (limited) {
    return NextResponse.json({ error: "Too many uploads. Please wait." }, { status: 429 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 25 MB)." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fileType = MIME_TO_TYPE[file.type] ?? EXT_TO_TYPE[ext];
  if (!fileType) {
    return NextResponse.json(
      {
        error:
          UNSUPPORTED_NATIVE[ext] ??
          "Unsupported file type. Upload a PNG, JPG, SVG, PDF, or KiCad .kicad_sch.",
      },
      { status: 400 },
    );
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());

  // Simple magic bytes check
  const header = bytes.toString("hex", 0, 4);
  let isValid = false;
  if (fileType === "png" && header.startsWith("89504e47")) isValid = true;
  else if (fileType === "jpg" && header.startsWith("ffd8")) isValid = true;
  else if (fileType === "pdf" && header.startsWith("25504446")) isValid = true;
  else if (fileType === "svg" && bytes.toString("utf8", 0, 1024).toLowerCase().includes("<svg")) isValid = true;
  else if (fileType === "kicad_sch") isValid = true; // Harder to check magic bytes, rely on CLI parsing later

  if (!isValid) {
    return NextResponse.json({ error: "Invalid file content." }, { status: 400 });
  }

  let fileUrl: string;
  let servedType: string;
  let originalUrl: string | null = null;
  let originalName: string | null = null;

  if (fileType === "kicad_sch") {
    // Store the native source, then render it to SVG for the viewer.
    const id = randomUUID();
    const nativePath = path.join(uploadsDir, `${id}.kicad_sch`);
    await writeFile(nativePath, bytes);
    try {
      const svgPath = await convertKicadSchToSvg(nativePath, uploadsDir);
      fileUrl = `/uploads/${path.basename(svgPath)}`;
      servedType = "svg";
      originalUrl = `/uploads/${id}.kicad_sch`;
      originalName = file.name;
    } catch (err) {
      console.error("KiCad conversion failed:", err);
      return NextResponse.json(
        {
          error:
            "Couldn't render this KiCad schematic. Make sure KiCad is installed on this machine (or set KICAD_CLI), or upload a PDF/SVG export instead.",
        },
        { status: 422 },
      );
    }
  } else {
    const storedName = `${randomUUID()}.${fileType}`;
    await writeFile(path.join(uploadsDir, storedName), bytes);
    fileUrl = `/uploads/${storedName}`;
    servedType = fileType;
  }

  const project = await prisma.project.create({
    data: {
      title,
      ownerEmail,
      files: {
        create: { fileUrl, fileType: servedType, originalUrl, originalName },
      },
    },
  });

  return NextResponse.json(
    { projectId: project.id, url: `/project/${project.id}` },
    { status: 201 },
  );
}
