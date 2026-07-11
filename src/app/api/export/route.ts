import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { readStored } from "@/lib/storage";
import { projectCapability, atLeast } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  wontfix: "Won't fix",
};

function safeParseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

const safeName = (s: string) =>
  s.replace(/[^\w.\-()+ ]+/g, "_").replace(/^\.+/, "").slice(-80) || "file";

const csvCell = (v: unknown) =>
  `"${String(v ?? "")
    .replace(/"/g, '""')
    .replace(/\r?\n/g, " ")}"`;

// GET /api/export?projectId=<id> -> a zip of ONE project, made for humans:
//   - the schematic file(s)
//   - comments.md  (the review, readable anywhere)
//   - comments.csv (the same comments for Excel)
//   - images/      (pictures pasted into comments)
// Deliberately NO raw database dump and NO export-everything mode — a zip you
// hand to someone contains this project and nothing else.
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "Pass ?projectId= — exports are per-project." },
      { status: 400 },
    );
  }

  const isLocal = LOCAL_HOSTS.has(req.nextUrl.hostname);
  const email = await getSessionEmail();

  const access = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerEmail: true, teamId: true, visibility: true },
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  // Anyone who can view the project may export it; private/team projects
  // require a member. (Local installs are the machine owner.)
  if (!isLocal && !atLeast(await projectCapability(access, email), "view")) {
    return NextResponse.json({ error: "You don't have access to this project." }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      title: true,
      createdAt: true,
      files: {
        orderBy: { uploadedAt: "asc" },
        select: {
          fileUrl: true,
          fileType: true,
          originalUrl: true,
          originalName: true,
          comments: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const zip = new JSZip();
  const exportedAt = new Date();

  // ---- Schematic file(s) at the top of the zip (original name when known) ----
  const usedNames = new Set<string>();
  const claim = (base: string) => {
    let name = safeName(base);
    let i = 2;
    while (usedNames.has(name)) name = `${i++}-${safeName(base)}`;
    usedNames.add(name);
    return name;
  };
  const toBundle: { zipPath: string; href: string }[] = [];
  const schematicNames: string[] = [];
  for (const f of project.files) {
    const rendered = claim(path.basename(f.fileUrl.split("?")[0]));
    toBundle.push({ zipPath: rendered, href: f.fileUrl });
    schematicNames.push(rendered);
    if (f.originalUrl && f.originalName) {
      const original = claim(f.originalName);
      toBundle.push({ zipPath: original, href: f.originalUrl });
      schematicNames.push(original);
    }
  }

  // ---- comments.md + comments.csv (whitelisted fields only — no internals) ----
  const md: string[] = [
    `# Review — ${project.title}`,
    ``,
    `Exported ${exportedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    ``,
  ];
  const csv: string[] = [
    [
      "thread",
      "type",
      "author",
      "status",
      "x_percent",
      "y_percent",
      "component",
      "part_number",
      "tags",
      "comment",
      "created_at",
    ].join(","),
  ];

  let threadCount = 0;
  let replyCount = 0;
  const imageHrefs = new Set<string>();

  for (const f of project.files) {
    const roots = f.comments.filter((c) => c.parentCommentId === null);
    if (project.files.length > 1) {
      md.push(`## ${f.originalName ?? path.basename(f.fileUrl.split("?")[0])}`, ``);
    }
    if (roots.length === 0) {
      md.push(`_No comments yet._`, ``);
    }
    for (const c of roots) {
      threadCount++;
      const n = threadCount;
      const status = STATUS_LABEL[c.status] ?? c.status;
      const pin =
        c.xPercent != null && c.yPercent != null
          ? ` — pin at (${c.xPercent.toFixed(1)}%, ${c.yPercent.toFixed(1)}%)`
          : "";
      md.push(`### #${n} · ${status} · ${c.authorName}${pin}`, ``, c.body, ``);

      const meta: string[] = [];
      const tags = safeParseTags(c.tags);
      if (tags.length) meta.push(`tags: ${tags.join(", ")}`);
      if (c.componentRef) meta.push(`component: ${c.componentRef}`);
      if (c.partNumber) meta.push(`part: ${c.partNumber}`);
      if (c.datasheetUrl) meta.push(`datasheet: ${c.datasheetUrl}`);
      if (meta.length) md.push(`> ${meta.join(" · ")}`, ``);

      csv.push(
        [
          n,
          "comment",
          csvCell(c.authorName),
          csvCell(status),
          c.xPercent ?? "",
          c.yPercent ?? "",
          csvCell(c.componentRef ?? ""),
          csvCell(c.partNumber ?? ""),
          csvCell(tags.join(" ")),
          csvCell(c.body),
          c.createdAt.toISOString(),
        ].join(","),
      );

      for (const r of f.comments.filter((x) => x.parentCommentId === c.id)) {
        replyCount++;
        md.push(`- **${r.authorName}** replied: ${r.body.replace(/\r?\n+/g, " ")}`);
        csv.push(
          [
            n,
            "reply",
            csvCell(r.authorName),
            "",
            "",
            "",
            "",
            "",
            "",
            csvCell(r.body),
            r.createdAt.toISOString(),
          ].join(","),
        );
      }
      md.push(``);

      // Collect images pasted into any comment body of this thread.
      for (const body of [c.body, ...f.comments.filter((x) => x.parentCommentId === c.id).map((x) => x.body)]) {
        for (const m of body.matchAll(
          /\]\((https?:\/\/[^\s)]*\/uploads\/[^)\s]+|\/uploads\/[^)\s]+)\)/g,
        )) {
          imageHrefs.add(m[1]);
        }
      }
    }
  }

  zip.file("comments.md", md.join("\n"));
  zip.file("comments.csv", csv.join("\n"));

  // ---- Pasted images ----
  const missing: string[] = [];
  for (const href of imageHrefs) {
    const bytes = await readStored(href);
    const name = safeName(path.basename(href.split("?")[0]));
    if (bytes) zip.file(`images/${name}`, bytes);
    else missing.push(name);
  }
  for (const { zipPath, href } of toBundle) {
    const bytes = await readStored(href);
    if (bytes) zip.file(zipPath, bytes);
    else missing.push(zipPath);
  }
  if (missing.length) zip.file("MISSING-FILES.txt", missing.join("\n"));

  zip.file(
    "README.txt",
    [
      `SchemNotes export — "${project.title}"`,
      `Exported ${exportedAt.toISOString()}`,
      ``,
      `Contents:`,
      ...schematicNames.map((n) => `  ${n}  — the schematic`),
      `  comments.md   — the review (${threadCount} comment${threadCount === 1 ? "" : "s"}, ${replyCount} repl${replyCount === 1 ? "y" : "ies"}), readable in any editor`,
      `  comments.csv  — the same comments for Excel / spreadsheets`,
      `  images/       — pictures pasted into comments (if any)`,
      ``,
      `Pin positions are percentages relative to the schematic image.`,
      `This zip contains only this project — no account or site data.`,
    ].join("\n"),
  );

  const buf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const slug =
    project.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "project";
  const stamp = exportedAt.toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="schemnotes-${slug}-${stamp}.zip"`,
      "Content-Length": String(buf.length),
    },
  });
}
