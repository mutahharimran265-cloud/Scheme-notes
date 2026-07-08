// Client-side "Download PDF": rasterize the schematic (browser-faithful, fonts
// and all), overlay the numbered comment pins, then append the full comment
// list. Everything runs in the browser, so there are no server/deploy deps.

import type { ThreadDTO } from "./types";
import { statusOf, STATUS_LABEL } from "./status";

type Numbered = ThreadDTO & { number: number };

const STATUS_HEX: Record<string, string> = {
  open: "#4f46e5", // indigo
  in_review: "#0ea5e9", // sky
  resolved: "#059669", // emerald
  wontfix: "#d97706", // amber
};

async function rasterize(fileUrl: string, fileType: string): Promise<HTMLCanvasElement> {
  if (fileType === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({ url: fileUrl }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return canvas;
  }

  // png / jpg / svg — the browser rasterizes it natively (SVG with its fonts).
  // Fetch to a same-origin object URL first so a cross-origin (Blob) image
  // can't taint the canvas — toDataURL() would otherwise throw.
  let src = fileUrl;
  let objectUrl: string | null = null;
  try {
    const res = await fetch(fileUrl);
    if (res.ok) {
      objectUrl = URL.createObjectURL(await res.blob());
      src = objectUrl;
    }
  } catch {
    /* fall back to the raw URL */
  }

  const img = new Image();
  img.src = src;
  await img.decode();
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (!w || !h) {
    w = 1600; // SVG with no intrinsic size — pick a sensible raster size
    h = 1000;
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  return canvas;
}

function drawPins(canvas: HTMLCanvasElement, threads: Numbered[]) {
  const ctx = canvas.getContext("2d")!;
  const r = Math.max(14, Math.round(Math.min(canvas.width, canvas.height) * 0.018));
  ctx.font = `bold ${Math.round(r * 1.1)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const t of threads) {
    if (t.xPercent == null || t.yPercent == null) continue;
    const x = (t.xPercent / 100) * canvas.width;
    const y = (t.yPercent / 100) * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = STATUS_HEX[statusOf(t)] ?? STATUS_HEX.open;
    ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.18);
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(t.number), x, y + 1);
  }
}

export async function downloadReviewPdf(opts: {
  title: string;
  fileUrl: string;
  fileType: string;
  threads: Numbered[];
}) {
  const { jsPDF } = await import("jspdf");
  const canvas = await rasterize(opts.fileUrl, opts.fileType);
  drawPins(canvas, opts.threads);
  const imgData = canvas.toDataURL("image/png");

  const landscape = canvas.width >= canvas.height;
  const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const margin = 40;
  const title = opts.title || "Schematic review";
  const open = opts.threads.filter((t) => statusOf(t) === "open").length;

  // Page 1 — schematic with pins.
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(title, margin, margin);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(120);
  pdf.text(
    `${opts.threads.length} comment${opts.threads.length === 1 ? "" : "s"} · ${open} open · ${new Date().toLocaleDateString()}`,
    margin,
    margin + 16,
  );
  pdf.setTextColor(0);
  const availW = pw - margin * 2;
  const availH = ph - (margin + 30) - margin;
  const scale = Math.min(availW / canvas.width, availH / canvas.height);
  const iw = canvas.width * scale;
  const ih = canvas.height * scale;
  pdf.addImage(imgData, "PNG", margin + (availW - iw) / 2, margin + 30, iw, ih);

  // Comment list — portrait pages.
  pdf.addPage("a4", "portrait");
  const cw = pdf.internal.pageSize.getWidth();
  const cph = pdf.internal.pageSize.getHeight();
  const lineW = cw - margin * 2;
  let y = margin;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Comments", margin, y);
  y += 22;

  const ensure = (needed: number) => {
    if (y + needed > cph - margin) {
      pdf.addPage("a4", "portrait");
      y = margin;
    }
  };

  if (opts.threads.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(120);
    pdf.text("No comments on this schematic yet.", margin, y);
  }

  for (const t of opts.threads) {
    ensure(30);
    const st = statusOf(t);
    pdf.setFillColor(STATUS_HEX[st] ?? STATUS_HEX.open);
    pdf.circle(margin + 4, y - 3, 4, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(0);
    let head = `#${t.number}  ${t.authorName}`;
    if (st !== "open") head += `  (${STATUS_LABEL[st]})`;
    if (t.componentRef) head += `  [${t.componentRef}]`;
    pdf.text(head, margin + 14, y);
    y += 15;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(55);
    for (const ln of pdf.splitTextToSize(t.body.replace(/\s+/g, " ").trim(), lineW - 14)) {
      ensure(12);
      pdf.text(ln, margin + 14, y);
      y += 12;
    }
    for (const rep of t.replies) {
      pdf.setTextColor(120);
      const text = `↳ ${rep.authorName}: ${rep.body.replace(/\s+/g, " ").trim()}`;
      for (const ln of pdf.splitTextToSize(text, lineW - 28)) {
        ensure(12);
        pdf.text(ln, margin + 28, y);
        y += 12;
      }
    }
    pdf.setTextColor(0);
    y += 10;
  }

  const slug = title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "schematic";
  pdf.save(`${slug}-review.pdf`);
}
