# SchemNotes local REST API

Everything the UI does goes through this API, so anything you can click you
can script — e.g. auto-logging annotations from a test rig, CI posting a
review link, or bulk-importing comments.

Base URL: `http://127.0.0.1:3000` (use `127.0.0.1`, not `localhost`, in Node
scripts — Node resolves `localhost` to IPv6 while the dev server binds IPv4).

## Authentication

| Mechanism | Use |
| --- | --- |
| *(none)* | Reading comments and creating them with a display name — commenting is login-free by design. Rate-limited. |
| `x-author-token: <secret>` | A per-client secret proving comment ownership (edit/delete your own). The browser generates one automatically; scripts can use any stable random string. |
| `Authorization: Bearer sn_…` | **API token** (create on the dashboard → API tokens). Skips rate limits and acts as the author identity — comments it creates can later be edited/deleted by presenting the same token as `x-author-token`. Invalid tokens get `401`. |

Token management endpoints (`/api/tokens*`) and full export are open on
localhost and session-gated when hosted.

## Endpoints

| Method + path | Purpose |
| --- | --- |
| `POST /api/upload` | Create a project (multipart: `file`, `title`, optional `ownerEmail`). Accepts PNG/JPG/SVG/PDF/`.kicad_sch`. → `{ projectId, url }` |
| `POST /api/projects/:id/revisions` | Add a revision (multipart: `file`, `name`, `note?`, `carryOver` = `"true"` to copy outstanding comments). → `{ revisionId, fileId, carried }` |
| `GET /api/projects` | List your projects (session required). |
| `PATCH /api/projects/:id` | Rename (`{ title }`, owner session required). |
| `DELETE /api/projects/:id` | Delete a project + everything in it (owner session required). |
| `GET /api/comments?fileId=…&page=1&limit=100` | List comment threads for a schematic file (paged). |
| `POST /api/comments` | Create a thread or reply (JSON, see below). |
| `PATCH /api/comments/:id` | `{ status }` (`open`/`in_review`/`resolved`/`wontfix`, open to anyone with the link) or `{ body }` (author only). |
| `DELETE /api/comments/:id` | Delete own comment (author token required). |
| `POST /api/attachments` | Upload a pasted image (multipart `file`, PNG/JPG/GIF/WebP ≤ 10 MB). → `{ url }` for embedding as markdown. |
| `GET /api/export` | Download a zip of all data + files. |
| `GET/POST /api/tokens`, `DELETE /api/tokens/:id` | Manage API tokens. |

## Creating a comment

```jsonc
POST /api/comments
{
  "schematicFileId": "…",       // from the revision/upload response
  "authorName": "Bringup rig",
  "body": "TP7 rail sagged to 2.9 V under load\n\n![capture](/uploads/….png)",
  "xPercent": 42.5,              // pin position, % of image width (roots only)
  "yPercent": 18.0,
  "tags": ["power", "bringup"],  // optional
  "componentRef": "U3",          // optional designator/net
  "partNumber": "TPS7A2033",     // optional
  "datasheetUrl": "https://…",   // optional, http(s) only
  "parentCommentId": "…"         // instead of x/y → makes it a reply
}
```

Bodies are markdown (GFM): line breaks, lists, `code`, tables, and images
that point at `/uploads/…` (remote images are shown as links, never fetched).

## Worked example — log a failure from a test rig

```js
// rig-log.mjs — node rig-log.mjs <schematicFileId> "message" x y
const TOKEN = process.env.SCHEMNOTES_TOKEN; // sn_… from the dashboard
const [fileId, message, x, y] = process.argv.slice(2);

// 1. attach the scope capture
const fd = new FormData();
fd.append("file", new Blob([await import("node:fs/promises").then(m => m.readFile("capture.png"))]), "capture.png");
const { url } = await (await fetch("http://127.0.0.1:3000/api/attachments", {
  method: "POST", body: fd,
})).json();

// 2. drop the pinned comment
const res = await fetch("http://127.0.0.1:3000/api/comments", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TOKEN}`,
  },
  body: JSON.stringify({
    schematicFileId: fileId,
    authorName: "Bringup rig",
    body: `${message}\n\n![capture](${url})`,
    xPercent: Number(x),
    yPercent: Number(y),
    tags: ["rig", "auto"],
  }),
});
console.log(res.status, await res.json());
```

## Rate limits (without a Bearer token)

- Comments: 30/min per author token or IP
- Uploads (projects + revisions): 10/min
- Attachments: 20/min

All data stays on the machine running SchemNotes — there is no cloud
dependency anywhere in this API.
