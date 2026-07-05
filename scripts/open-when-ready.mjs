// Poll the dev server and open the browser only once it actually responds.
//   node scripts/open-when-ready.mjs <url> [--dry-run]
// Replaces the old fixed startup delay (which raced slow first compiles).
// Uses node:http with agent:false (not fetch) and exits naturally — fetch's
// keep-alive sockets + process.exit() crash libuv on Windows.
import { exec } from "node:child_process";
import http from "node:http";

const url = process.argv[2] || "http://localhost:3000";
const dryRun = process.argv.includes("--dry-run");
const deadline = Date.now() + 180_000; // generous: first run compiles + installs SWC

function isReady() {
  return new Promise((resolve) => {
    const req = http.get(url, { agent: false, timeout: 2500 }, (res) => {
      res.resume(); // drain so the socket closes
      resolve((res.statusCode ?? 500) < 500);
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

function openBrowser() {
  if (dryRun) {
    console.log(`[open-when-ready] READY ${url} (dry run — not opening)`);
    return Promise.resolve();
  }
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  return new Promise((resolve) => {
    exec(
      cmd,
      { shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh" },
      () => resolve(undefined),
    );
  });
}

let ready = false;
while (Date.now() < deadline) {
  if (await isReady()) {
    ready = true;
    break;
  }
  await new Promise((r) => setTimeout(r, 500));
}

if (ready) {
  await openBrowser();
} else {
  console.error(`[open-when-ready] Gave up waiting for ${url} after 3 minutes.`);
  process.exitCode = 1;
}
