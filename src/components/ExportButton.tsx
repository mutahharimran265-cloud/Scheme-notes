"use client";

import { useState } from "react";
import { Toast } from "./Toast";

/** One-click "export everything" — downloads a zip of all data + files. */
export default function ExportButton() {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Export failed. Please try again.");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `schemnotes-export-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      setToast("Export downloaded — annotations, schematics, and files.");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        title="Download a zip of all projects, comments, and schematic files"
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {busy ? (
          "Exporting…"
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            Export data
          </>
        )}
      </button>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
