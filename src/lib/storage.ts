// Pluggable upload storage. On Vercel (and any serverless host) the filesystem
// is read-only, so uploaded files go to Vercel Blob when BLOB_READ_WRITE_TOKEN
// is set; otherwise they're written to public/uploads on local disk (dev + any
// host with a persistent disk). The rest of the app only deals in the returned
// href, so it doesn't care which backend is active.

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const uploadsDir = () => path.join(process.cwd(), "public", "uploads");

export function isRemoteStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

const EXT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  kicad_sch: "text/plain",
};

export function contentTypeFor(name: string): string {
  return EXT_TYPE[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

/** Store `bytes` under `name` and return the href to reference/display it by. */
export async function putFile(name: string, bytes: Buffer, contentType?: string): Promise<string> {
  const type = contentType ?? contentTypeFor(name);
  if (isRemoteStorage()) {
    const { put } = await import("@vercel/blob");
    const { url } = await put(`uploads/${name}`, bytes, {
      access: "public",
      contentType: type,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return url; // full, public, permanent Blob URL
  }
  await mkdir(uploadsDir(), { recursive: true });
  await writeFile(path.join(uploadsDir(), name), bytes);
  return `/uploads/${name}`;
}

/**
 * Read a stored file's bytes given the href we saved (a full Blob URL, or a
 * local `/uploads/<name>` path). Returns null if it can't be read.
 */
export async function readStored(href: string): Promise<Buffer | null> {
  if (/^https?:\/\//i.test(href)) {
    try {
      const res = await fetch(href);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }
  const fp = path.join(uploadsDir(), path.basename(href));
  if (!existsSync(fp)) return null;
  return readFile(fp);
}
