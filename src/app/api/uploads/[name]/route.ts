import { NextRequest, NextResponse } from "next/server";
import { readStored, contentTypeFor } from "@/lib/storage";

export const runtime = "nodejs";

// GET /api/uploads/[name] -> stream a stored upload. `/uploads/:name` rewrites
// here (see next.config.ts) so uploaded files are served in production, where
// `next start` won't serve files added to public/ after the build. Blob deploys
// reference the Blob URL directly and never hit this route.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  // readStored() reduces the href to its basename for local reads, so path
  // traversal via the name segment is not possible.
  const bytes = await readStored(`/uploads/${name}`);
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentTypeFor(name),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(bytes.length),
      // Same hardening as the static path: block script + MIME sniffing so a
      // malicious SVG can't execute if opened directly (defense-in-depth).
      "Content-Security-Policy": "script-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
