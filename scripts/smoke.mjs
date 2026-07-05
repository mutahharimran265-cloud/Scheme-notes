// End-to-end smoke test against a running dev server.
//   node scripts/smoke.mjs <path-to-svg>   (server must be running on $BASE)
// Exercises the full comment lifecycle, ownership enforcement, validation,
// and the magic-link auth + project-ownership chain.
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";

const BASE = process.env.BASE || "http://localhost:3210";
const prisma = new PrismaClient();
const createdProjectIds = [];

let passed = 0;
function ok(cond, msg) {
  if (!cond) throw new Error("FAILED: " + msg);
  passed++;
  console.log("  ✓ " + msg);
}

async function uploadFile(buf, title, cookie) {
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: "image/svg+xml" }), "schem.svg");
  fd.append("title", title);
  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    body: fd,
    headers: cookie ? { cookie } : {},
  });
  const json = await res.json();
  if (json.projectId) createdProjectIds.push(json.projectId);
  return { res, json };
}

async function main() {
  const svgPath = process.argv[2];
  if (!svgPath) throw new Error("Pass an SVG path as the first argument.");
  const buf = await readFile(svgPath);
  const token = "smoke-token-" + Date.now();
  const jsonHeaders = { "Content-Type": "application/json", "x-author-token": token };

  console.log("Comment lifecycle:");
  const { res: up, json: upJson } = await uploadFile(buf, "Smoke test schematic");
  ok(up.status === 201 && upJson.projectId, "upload returns 201 + projectId");

  const project = await prisma.project.findUnique({
    where: { id: upJson.projectId },
    include: { files: true },
  });
  const fileId = project.files[0].id;
  ok(!!fileId, "schematic file row created");

  const t = await fetch(`${BASE}/api/comments`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      schematicFileId: fileId,
      authorName: "Alex",
      body: "Is R1 the right value here?",
      xPercent: 30.5,
      yPercent: 12.25,
      authorToken: token,
    }),
  });
  const tJson = await t.json();
  ok(t.status === 201 && tJson.comment?.id, "create thread (201)");
  ok(tJson.comment.isOwn === true, "thread marked isOwn for its author");
  const threadId = tJson.comment.id;

  const r = await fetch(`${BASE}/api/comments`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      schematicFileId: fileId,
      parentCommentId: threadId,
      authorName: "Sam",
      body: "Agree, 10k seems safer.",
      authorToken: token,
    }),
  });
  ok(r.status === 201, "create reply (201)");

  const list = await (
    await fetch(`${BASE}/api/comments?fileId=${fileId}`, {
      headers: { "x-author-token": token },
    })
  ).json();
  ok(list.threads.length === 1, "one thread listed");
  ok(list.threads[0].replies.length === 1, "thread carries one reply");
  ok(list.threads[0].xPercent === 30.5, "pin x% persisted exactly");

  const resolved = await (
    await fetch(`${BASE}/api/comments/${threadId}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({ resolved: true }),
    })
  ).json();
  ok(resolved.comment.resolved === true, "thread can be resolved");

  const edited = await (
    await fetch(`${BASE}/api/comments/${threadId}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({ body: "Is R1 (1k) correct — should it be 10k?" }),
    })
  ).json();
  ok(edited.comment.body.includes("10k"), "author can edit own comment");

  const wf = await (
    await fetch(`${BASE}/api/comments/${threadId}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({ status: "wontfix" }),
    })
  ).json();
  ok(wf.comment.status === "wontfix", "status can be set to won't fix");
  ok(wf.comment.resolved === true, "won't-fix keeps resolved in sync");

  console.log("Metadata:");
  const t2res = await fetch(`${BASE}/api/comments`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      schematicFileId: fileId,
      authorName: "Alex",
      body: "Check decoupling on U3",
      xPercent: 55.5,
      yPercent: 44.25,
      authorToken: token,
      tags: ["power", "#emi"],
      componentRef: "U3",
      partNumber: "TPS7A2033",
      datasheetUrl: "https://example.com/tps7a20.pdf",
    }),
  });
  const t2 = (await t2res.json()).comment;
  ok(t2res.status === 201 && t2.componentRef === "U3", "thread stores componentRef");
  ok(
    Array.isArray(t2.tags) && t2.tags.includes("power") && t2.tags.includes("emi"),
    "tags stored + normalized (# stripped)",
  );
  ok(t2.datasheetUrl === "https://example.com/tps7a20.pdf", "datasheet URL stored");

  const ir = await (
    await fetch(`${BASE}/api/comments/${t2.id}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({ status: "in_review" }),
    })
  ).json();
  ok(
    ir.comment.status === "in_review" && ir.comment.resolved === false,
    "in_review is outstanding (not resolved)",
  );

  console.log("Attachments & API tokens:");
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const afd = new FormData();
  afd.append("file", new Blob([pngBytes], { type: "image/png" }), "capture.png");
  const att = await fetch(`${BASE}/api/attachments`, { method: "POST", body: afd });
  const attJson = await att.json();
  ok(
    att.status === 201 && attJson.url.startsWith("/uploads/"),
    "pasted image stored (201 + url)",
  );
  ok((await fetch(`${BASE}${attJson.url}`)).status === 200, "attachment is served");

  const badFd = new FormData();
  badFd.append("file", new Blob([Buffer.from("<svg></svg>")], { type: "image/png" }), "fake.png");
  const bad = await fetch(`${BASE}/api/attachments`, { method: "POST", body: badFd });
  ok(bad.status === 400, "non-image content rejected by magic bytes");

  const tok = await fetch(`${BASE}/api/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: "smoke rig" }),
  });
  const tokJson = await tok.json();
  ok(
    tok.status === 201 && tokJson.token.startsWith("sn_"),
    "API token created (secret returned once)",
  );

  const rigRes = await fetch(`${BASE}/api/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokJson.token}`,
    },
    body: JSON.stringify({
      schematicFileId: fileId,
      authorName: "Bringup rig",
      body: `Auto-logged failure\n\n![capture](${attJson.url})`,
      xPercent: 10,
      yPercent: 10,
    }),
  });
  const rig = (await rigRes.json()).comment;
  ok(rigRes.status === 201 && rig.isOwn === true, "Bearer token creates + owns a comment");

  const rigList = await (
    await fetch(`${BASE}/api/comments?fileId=${fileId}`, {
      headers: { "x-author-token": tokJson.token },
    })
  ).json();
  ok(
    rigList.threads.some((t) => t.id === rig.id && t.isOwn),
    "token doubles as author token for ownership",
  );

  const revoke = await fetch(`${BASE}/api/tokens/${tokJson.id}`, { method: "DELETE" });
  ok(revoke.status === 200, "token revoked");
  const rejected = await fetch(`${BASE}/api/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokJson.token}`,
    },
    body: JSON.stringify({
      schematicFileId: fileId,
      authorName: "Bringup rig",
      body: "should fail",
      xPercent: 1,
      yPercent: 1,
    }),
  });
  ok(rejected.status === 401, "revoked token -> 401");

  const delRig = await fetch(`${BASE}/api/comments/${rig.id}`, {
    method: "DELETE",
    headers: { "x-author-token": tokJson.token },
  });
  ok(delRig.status === 200, "rig comment still deletable with its token");

  console.log("Security / validation:");
  const wrongEdit = await fetch(`${BASE}/api/comments/${threadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-author-token": "not-the-owner" },
    body: JSON.stringify({ body: "tampered" }),
  });
  ok(wrongEdit.status === 403, "edit with wrong token -> 403");

  const wrongDelete = await fetch(`${BASE}/api/comments/${threadId}`, {
    method: "DELETE",
    headers: { "x-author-token": "not-the-owner" },
  });
  ok(wrongDelete.status === 403, "delete with wrong token -> 403");

  const emptyBody = await fetch(`${BASE}/api/comments`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      schematicFileId: fileId,
      authorName: "Alex",
      body: "   ",
      xPercent: 5,
      yPercent: 5,
      authorToken: token,
    }),
  });
  ok(emptyBody.status === 400, "empty comment body -> 400");

  const noPin = await fetch(`${BASE}/api/comments`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      schematicFileId: fileId,
      authorName: "Alex",
      body: "no pin",
      authorToken: token,
    }),
  });
  ok(noPin.status === 400, "new thread without pin coords -> 400");

  const del = await fetch(`${BASE}/api/comments/${threadId}`, {
    method: "DELETE",
    headers: { "x-author-token": token },
  });
  ok(del.status === 200, "author deletes own thread");
  const after = await (
    await fetch(`${BASE}/api/comments?fileId=${fileId}`, {
      headers: { "x-author-token": token },
    })
  ).json();
  // t2 (the metadata thread) legitimately remains; threadId + its reply must be gone.
  ok(
    after.threads.length === 1 && after.threads.every((t) => t.id !== threadId),
    "deleting a thread cascades its replies",
  );

  console.log("Auth + ownership:");
  const reqRes = await fetch(`${BASE}/api/auth/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@example.com" }),
  });
  const reqJson = await reqRes.json();
  ok(reqRes.ok && reqJson.devLink, "magic link issued (devLink in dev)");

  const verify = await fetch(reqJson.devLink, { redirect: "manual" });
  const setCookies = verify.headers.getSetCookie();
  const session = setCookies.find((c) => c.startsWith("schemnotes_session="));
  ok(!!session, "verify sets a session cookie");
  const cookie = session.split(";")[0];

  const badEmail = await fetch(`${BASE}/api/auth/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nope" }),
  });
  ok(badEmail.status === 400, "invalid email rejected");

  const { res: up2 } = await uploadFile(buf, "Owned smoke schematic", cookie);
  ok(up2.status === 201, "authenticated upload ok");
  const dashHtml = await (await fetch(`${BASE}/dashboard`, { headers: { cookie } })).text();
  ok(dashHtml.includes("Owned smoke schematic"), "dashboard lists the owner's project");

  const ownedId = createdProjectIds[createdProjectIds.length - 1];
  const rename = await fetch(`${BASE}/api/projects/${ownedId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ title: "Renamed by test" }),
  });
  ok(rename.status === 200, "owner can rename their project");
  const renameNoAuth = await fetch(`${BASE}/api/projects/${ownedId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "hacked" }),
  });
  ok(renameNoAuth.status === 401, "rename without a session -> 401");

  console.log(`\nALL ${passed} CHECKS PASSED ✅`);
}

main()
  .catch((e) => {
    console.error("\n" + e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Clean up everything this test created.
    if (createdProjectIds.length) {
      await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    }
    await prisma.$disconnect();
  });
