import { NextRequest, NextResponse } from "next/server";
import { gzipSync } from "node:zlib";
import { readStored, contentTypeFor } from "@/lib/storage";

export const runtime = "nodejs";

// Text-based schematic formats worth gzipping. SVG is XML and typically
// compresses 5-8x — a big win over slow links. Already-compressed binaries
// (png/jpg/pdf) gain nothing and are served as-is.
const COMPRESSIBLE = new Set(["image/svg+xml", "text/plain"]);

// GET /api/uploads/[name] -> stream a stored upload. `/uploads/:name` rewrites
// here (see next.config.ts) so uploaded files are served in production, where
// `next start` won't serve files added to public/ after the build. Blob deploys
// reference the Blob URL directly and never hit this route.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  // readStored() reduces the href to its basename for local reads, so path
  // traversal via the name segment is not possible.
  const bytes = await readStored(`/uploads/${name}`);
  if (!bytes) return new NextResponse("Not found", { status: 404 });

  const type = contentTypeFor(name);
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Cache-Control": "public, max-age=31536000, immutable",
    // Same hardening as the static path: block script + MIME sniffing so a
    // malicious SVG can't execute if opened directly (defense-in-depth).
    "Content-Security-Policy": "script-src 'none'; sandbox",
    "X-Content-Type-Options": "nosniff",
    Vary: "Accept-Encoding",
  };

  // Gzip compressible schematics when the client accepts it — an uncompressed
  // SVG can be 5-8x larger than needed, which dominates load time on slow
  // connections. Skipped for already-compressed formats and tiny files.
  const acceptsGzip = (req.headers.get("accept-encoding") || "").includes("gzip");
  if (acceptsGzip && COMPRESSIBLE.has(type) && bytes.length > 1024) {
    const gz = gzipSync(bytes);
    headers["Content-Encoding"] = "gzip";
    headers["Content-Length"] = String(gz.length);
    return new NextResponse(new Uint8Array(gz), { headers });
  }

  headers["Content-Length"] = String(bytes.length);
  return new NextResponse(new Uint8Array(bytes), { headers });
}
