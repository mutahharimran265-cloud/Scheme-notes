"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createRevision } from "@/lib/api";

export type RevisionSummary = {
  id: string;
  name: string;
  createdAt: string;
};

type Props = {
  projectId: string;
  revisions: RevisionSummary[]; // newest first
  activeId: string;
};

const ACCEPT =
  ".png,.jpg,.jpeg,.svg,.pdf,.kicad_sch,image/png,image/jpeg,image/svg+xml,application/pdf";

export default function RevisionBar({ projectId, revisions, activeId }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="revision-select">
        Revision
      </label>
      <select
        id="revision-select"
        value={activeId}
        onChange={(e) => router.push(`/project/${projectId}?rev=${e.target.value}`)}
        className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-700 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      >
        {revisions.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} · {new Date(r.createdAt).toLocaleDateString()}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="whitespace-nowrap rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        + New revision
      </button>

      {dialogOpen && (
        <NewRevisionDialog
          projectId={projectId}
          suggestedName={`rev ${String.fromCharCode(65 + Math.min(revisions.length, 25))}`}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}

function NewRevisionDialog({
  projectId,
  suggestedName,
  onClose,
}: {
  projectId: string;
  suggestedName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(suggestedName);
  const [carryOver, setCarryOver] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) {
      setError("Choose the schematic file for this revision.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await createRevision(projectId, {
        file,
        name: name.trim() || suggestedName,
        carryOver,
      });
      router.push(`/project/${projectId}?rev=${result.revisionId}`);
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the revision.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-50">
          New revision
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Upload the updated schematic. Outstanding comments can be carried
          over so nothing gets lost between revisions.
        </p>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-6 text-center text-sm hover:border-indigo-400 dark:border-zinc-700">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              setError(null);
              setFile(e.target.files?.[0] ?? null);
            }}
          />
          {file ? (
            <span className="font-medium text-zinc-800 dark:text-zinc-100">{file.name}</span>
          ) : (
            <>
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                Choose the new schematic
              </span>
              <span className="text-xs text-zinc-400">PNG, JPG, SVG, PDF, or .kicad_sch</span>
            </>
          )}
        </label>

        <label className="mt-4 flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Revision name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={carryOver}
            onChange={(e) => setCarryOver(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-indigo-600"
          />
          <span className="text-zinc-700 dark:text-zinc-300">
            Carry over outstanding comments
            <span className="block text-xs text-zinc-400">
              Open and in-review threads keep their pins and authors on the new revision.
            </span>
          </span>
        </label>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Create revision"}
          </button>
        </div>
      </div>
    </div>
  );
}
