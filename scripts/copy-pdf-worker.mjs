// Copies the pdf.js worker into /public so the viewer can load it from a stable
// URL (/pdf.worker.min.mjs), independent of the bundler. Runs on `postinstall`
// so the worker version always matches the installed pdfjs-dist.
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const candidates = [
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  "node_modules/pdfjs-dist/build/pdf.worker.mjs",
];

const src = candidates.find((c) => existsSync(c));
if (!src) {
  console.warn("[copy-pdf-worker] pdfjs-dist worker not found; skipping.");
  process.exit(0);
}

const dest = path.join("public", "pdf.worker.min.mjs");
await mkdir("public", { recursive: true });
await copyFile(src, dest);
console.log(`[copy-pdf-worker] Copied ${src} -> ${dest}`);
