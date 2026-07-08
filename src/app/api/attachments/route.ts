import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isRateLimited } from "@/lib/rate-limit";
import { putFile } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per pasted image

// POST /api/attachments -> store a pasted image (scope capture, photo) and
// return its URL for embedding in a markdown comment body.
export async function POST(req: NextRequest) {
  const identifier =
    req.headers.get("x-author-token") || req.headers.get("x-forwarded-for") || "unknown";
  const { limited } = isRateLimited(`attach:${identifier}`, 20, 60 * 1000);
  if (limited) {
    return NextResponse.json({ error: "Too many images. Please wait." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 10 MB)." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const hex = bytes.toString("hex", 0, 12);
  let ext: string | null = null;
  if (hex.startsWith("89504e47")) ext = "png";
  else if (hex.startsWith("ffd8")) ext = "jpg";
  else if (hex.startsWith("47494638")) ext = "gif";
  else if (hex.startsWith("52494646") && bytes.toString("ascii", 8, 12) === "WEBP")
    ext = "webp";

  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported image. Paste a PNG, JPG, GIF, or WebP." },
      { status: 400 },
    );
  }

  const name = `${randomUUID()}.${ext}`;
  const url = await putFile(name, bytes);

  return NextResponse.json({ url }, { status: 201 });
}
