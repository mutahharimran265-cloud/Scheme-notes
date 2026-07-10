// Shared schematic-upload validation + storage, used by /api/upload. Keeps the
// magic-byte checks and KiCad conversion identical on every upload path.
import { writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { convertKicadSchToSvg } from "./kicad";
import { putFile } from "./storage";
import { sanitizeSvg } from "./sanitize";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

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

export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type StoredUpload = {
  fileUrl: string;
  servedType: string;
  originalUrl: string | null;
  originalName: string | null;
};

/** Validate (type + magic bytes) and store an uploaded schematic. */
export async function storeSchematicUpload(file: unknown): Promise<StoredUpload> {
  if (!(file instanceof File) || file.size === 0) {
    throw new UploadError("No file provided.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError("File too large (max 25 MB).");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fileType = MIME_TO_TYPE[file.type] ?? EXT_TO_TYPE[ext];
  if (!fileType) {
    throw new UploadError(
      UNSUPPORTED_NATIVE[ext] ??
        "Unsupported file type. Upload a PNG, JPG, SVG, PDF, or KiCad .kicad_sch.",
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Magic-byte validation (content must match the claimed type).
  const header = bytes.toString("hex", 0, 4);
  let isValid = false;
  if (fileType === "png" && header.startsWith("89504e47")) isValid = true;
  else if (fileType === "jpg" && header.startsWith("ffd8")) isValid = true;
  else if (fileType === "pdf" && header.startsWith("25504446")) isValid = true;
  else if (
    fileType === "svg" &&
    bytes.toString("utf8", 0, 1024).toLowerCase().includes("<svg")
  )
    isValid = true;
  else if (fileType === "kicad_sch") isValid = true; // validated by kicad-cli parse below

  if (!isValid) {
    throw new UploadError("Invalid file content.");
  }

  if (fileType === "kicad_sch") {
    // kicad-cli needs real files on disk — convert in a temp dir, then hand the
    // rendered SVG + native source to storage (local disk or Blob).
    const id = randomUUID();
    const tmp = await mkdtemp(path.join(os.tmpdir(), "schemnotes-"));
    const nativePath = path.join(tmp, `${id}.kicad_sch`);
    await writeFile(nativePath, bytes);
    try {
      const svgPath = await convertKicadSchToSvg(nativePath, tmp);
      const svgText = (await readFile(svgPath)).toString("utf8");
      const fileUrl = await putFile(
        `${id}.svg`,
        Buffer.from(sanitizeSvg(svgText), "utf8"),
        "image/svg+xml",
      );
      const originalUrl = await putFile(`${id}.kicad_sch`, bytes, "text/plain");
      return { fileUrl, servedType: "svg", originalUrl, originalName: file.name };
    } catch (err) {
      console.error("KiCad conversion failed:", err);
      throw new UploadError(
        "Couldn't render this KiCad schematic. Make sure KiCad is installed on this machine (or set KICAD_CLI), or upload a PDF/SVG export instead.",
        422,
      );
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }

  // Strip active content from user SVGs before storing (served same-origin).
  const outBytes =
    fileType === "svg" ? Buffer.from(sanitizeSvg(bytes.toString("utf8")), "utf8") : bytes;
  const storedName = `${randomUUID()}.${fileType}`;
  const fileUrl = await putFile(storedName, outBytes);
  return { fileUrl, servedType: fileType, originalUrl: null, originalName: null };
}
