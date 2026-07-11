"use client";

import { useState } from "react";
import { Toast } from "./Toast";

/**
 * Downloads a zip of ONE project: its schematic file(s) and comments.
 * Exports are always per-project — never the whole workspace — so a zip you
 * hand to someone can only ever contain the project you chose.
 */
export default function ExportButton({
  projectId,
  title,
}: {
  projectId: string;
  title?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/export?projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Export failed. Please try again.");
      }
      const blob = await res.blob();
      const slug =
        (title ?? "project")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || "project";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `schemnotes-${slug}-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      setToast("Project exported — schematic and comments.");
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
        title="Download a zip of this project (schematic + comments)"
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {busy ? (
          "Exporting…"
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            Export
          </>
        )}
      </button>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
