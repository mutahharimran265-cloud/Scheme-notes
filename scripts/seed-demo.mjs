// Seeds a realistic demo project (schematic + a few review comments) so you
// can see SchemNotes populated. Requires a running server on $BASE.
//   node scripts/seed-demo.mjs
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE || "http://localhost:3210";
const prisma = new PrismaClient();
const TOKEN = "demo-seed-token";
const h = { "Content-Type": "application/json", "x-author-token": TOKEN };

async function thread(fileId, authorName, body, xPercent, yPercent) {
  const res = await fetch(`${BASE}/api/comments`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      schematicFileId: fileId,
      authorName,
      body,
      xPercent,
      yPercent,
      authorToken: TOKEN,
    }),
  });
  return (await res.json()).comment;
}

async function reply(fileId, parentCommentId, authorName, body) {
  await fetch(`${BASE}/api/comments`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      schematicFileId: fileId,
      parentCommentId,
      authorName,
      body,
      authorToken: TOKEN,
    }),
  });
}

async function resolve(id) {
  await fetch(`${BASE}/api/comments/${id}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ resolved: true }),
  });
}

async function main() {
  const svg = await readFile(
    path.join(process.cwd(), "samples", "sample-schematic.svg"),
  );
  const fd = new FormData();
  fd.append("file", new Blob([svg], { type: "image/svg+xml" }), "sample-schematic.svg");
  fd.append("title", "Demo — Power supply rev B");
  const up = await (
    await fetch(`${BASE}/api/upload`, { method: "POST", body: fd })
  ).json();

  const project = await prisma.project.findUnique({
    where: { id: up.projectId },
    include: { files: true },
  });
  const fileId = project.files[0].id;

  const t1 = await thread(
    fileId,
    "Priya (reviewer)",
    "R1 = 1k gives ~8 mA into D1. Fine for rating, but a touch bright — consider 1.5k.",
    30,
    20,
  );
  await reply(
    fileId,
    t1.id,
    "You",
    "Agreed, I'll bump R1 to 1.5k in the next revision.",
  );

  await thread(
    fileId,
    "Priya (reviewer)",
    "C1 should sit right next to U1's supply pin for the decoupling to actually work.",
    51,
    38,
  );

  const t3 = await thread(
    fileId,
    "Marco",
    "Do we want a bulk cap on the 9V rail here?",
    12,
    47,
  );
  await resolve(t3.id);

  console.log(`\n✅ Demo project ready:\n   ${BASE}/project/${up.projectId}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
