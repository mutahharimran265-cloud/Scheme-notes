"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ACCEPT =
  ".png,.jpg,.jpeg,.svg,.pdf,.kicad_sch,image/png,image/jpeg,image/svg+xml,application/pdf";

export default function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | null) {
    setError(null);
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a schematic file first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title.trim() || file.name);
      if (email.trim()) fd.append("ownerEmail", email.trim());

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed. Please try again.");
        setBusy(false);
        return;
      }
      router.push(data.url);
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-all ${
          dragging
            ? "border-indigo-500 bg-indigo-500/[0.06]"
            : "border-black/15 hover:border-indigo-400 hover:bg-indigo-500/[0.03] dark:border-white/15"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 transition-transform group-hover:-translate-y-0.5 dark:text-indigo-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 15v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M12 3v13M7 8l5-5 5 5" />
          </svg>
        </span>
        {file ? (
          <span className="font-medium text-foreground">
            {file.name}{" "}
            <span className="text-foreground/40">
              ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </span>
        ) : (
          <>
            <span className="font-medium text-foreground/80">
              Drop a schematic here, or{" "}
              <span className="text-indigo-600 dark:text-indigo-400">browse</span>
            </span>
            <span className="text-sm text-foreground/45">
              PNG, JPG, SVG, PDF, or KiCad .kicad_sch — up to 25 MB
            </span>
          </>
        )}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground/70">Project title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Power supply rev B"
            className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-foreground outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground/70">
            Your email <span className="font-normal text-foreground/35">(optional)</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-foreground outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04]"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-3 font-medium text-white shadow-lg shadow-indigo-600/20 transition-all hover:shadow-indigo-600/30 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Uploading…" : "Upload & get share link"}
      </button>
      <p className="text-center text-xs text-foreground/40">
        Anyone with the link can view and comment — no account needed.
      </p>
    </form>
  );
}
