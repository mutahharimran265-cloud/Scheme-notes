"use client";

import { useEffect, useState } from "react";

type Backup = { name: string; sizeBytes: number; createdAt: string };

/** Dashboard section (Pro): rolling DB backups + a "back up now" button. */
export default function BackupsPanel() {
  const [backups, setBackups] = useState<Backup[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/backups");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't load backups.");
      setBackups(d.backups || []);
      setNote(d.note ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load backups.");
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function backupNow() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/backups", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Backup failed.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Backup failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12">
      <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Backups
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">
        Your database is backed up automatically before every migration, and you can snapshot it any
        time — a rolling set of restore points.
      </p>
      {note && <p className="mt-2 max-w-2xl text-sm text-zinc-500">{note}</p>}
      <div className="mt-3">
        <button
          onClick={backupNow}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Backing up…" : "Back up now"}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      {backups && backups.length > 0 && (
        <ul className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {backups.slice(0, 10).map((b) => (
            <li key={b.name} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-300">{b.name}</span>
              <span className="ml-auto text-xs text-zinc-400">
                {(b.sizeBytes / 1024).toFixed(0)} KB · {new Date(b.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
      {backups && backups.length === 0 && !note && (
        <p className="mt-3 text-sm text-zinc-400">No backups yet — create one above.</p>
      )}
    </section>
  );
}
