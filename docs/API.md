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
| session cookie | Owner-only actions — listing/renaming/deleting your projects. Sign in via `/api/auth/request` + `/api/auth/verify` (see below). |

There is no separate API-key system — the author token above *is* the
scripting credential, and it costs nothing to generate (just pick a random
string and reuse it).

## Endpoints

| Method + path | Purpose |
| --- | --- |
| `POST /api/upload` | Create a project (multipart: `file`, `title`). Accepts PNG/JPG/SVG/PDF/`.kicad_sch`. Ownership is taken from the session cookie if signed in. → `{ projectId, url }` |
| `GET /api/projects/:id` | Public project + schematic file info (no auth — this is the share-link payload). |
| `PATCH /api/projects/:id` | Rename (`{ title }`, owner session required). |
| `DELETE /api/projects/:id` | Delete a project + everything in it (owner session required). |
| `GET /api/comments?fileId=…&page=1&limit=100` | List comment threads for a schematic file (paged). |
| `POST /api/comments` | Create a thread or reply (JSON, see below). |
| `PATCH /api/comments/:id` | `{ status }` (`open`/`in_review`/`resolved`/`wontfix`, open to anyone with view access) or `{ body }` (author only). |
| `DELETE /api/comments/:id` | Delete own comment (author token required). |
| `POST /api/attachments` | Upload a pasted image (multipart `file`, PNG/JPG/GIF/WebP). Size cap depends on plan: 10 MB free, 50 MB Pro, 100 MB Team. → `{ url }` for embedding as markdown. |
| `POST /api/auth/request` | `{ email }` → sends (or, without SMTP configured, returns) a magic sign-in link. |
| `GET /api/auth/verify?token=…` | Exchanges a magic link for a session cookie. |

Private/team projects (Team plan) additionally require the session to be a
member — the same rules the UI enforces apply to every call above.

## Creating a comment

```jsonc
POST /api/comments
{
  "schematicFileId": "…",       // from the upload response
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

Bodies are markdown (GFM): line breaks, lists, `code`, tables, `@name@email.com`
mentions, and images that point at `/uploads/…` (remote images are shown as
links, never fetched).

## Worked example — log a failure from a test rig

```js
// rig-log.mjs — node rig-log.mjs <schematicFileId> "message" x y
const TOKEN = process.env.RIG_TOKEN || "bringup-rig-01"; // any stable string
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
  headers: { "Content-Type": "application/json", "x-author-token": TOKEN },
  body: JSON.stringify({
    schematicFileId: fileId,
    authorName: "Bringup rig",
    body: `${message}\n\n![capture](${url})`,
    xPercent: Number(x),
    yPercent: Number(y),
    authorToken: TOKEN,
    tags: ["rig", "auto"],
  }),
});
console.log(res.status, await res.json());
```

Reuse the same `TOKEN` string next time to edit or delete that comment later
(`x-author-token` header, matching what was sent as `authorToken` on create).

## Rate limits

- Comments: 30/min per author token or IP
- Uploads: 10/min, plus 5 projects/month on the Free plan
- Attachments: 20/min

All data stays on the machine running SchemNotes (or your own Postgres, once
deployed) — there is no third-party dependency anywhere in this API.
