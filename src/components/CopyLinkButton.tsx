"use client";

import { useEffect, useState } from "react";

// Legacy copy path for browsers/webviews without navigator.clipboard
// (common inside WhatsApp/Instagram in-app browsers and older Android).
function legacyCopy(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // navigator only exists client-side; set after mount to avoid hydration mismatch.
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function copyRobust(url: string) {
    let ok = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (!ok) ok = legacyCopy(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      // Absolute last resort — at least surface the URL to copy manually.
      window.prompt("Copy this link:", url);
    }
  }

  async function run() {
    const url = window.location.href;
    if (canShare) {
      // Native share sheet (phones): WhatsApp / mail / "Copy" all built in.
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to copying.
      }
    }
    await copyRobust(url);
  }

  return (
    <button
      type="button"
      onClick={run}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {copied ? "Link copied!" : canShare ? "Share link" : "Copy share link"}
    </button>
  );
}
