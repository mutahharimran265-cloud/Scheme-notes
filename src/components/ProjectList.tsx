"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { deleteProject, updateProject } from "@/lib/api";
import { ConfirmDialog } from "./ConfirmDialog";
import { Toast } from "./Toast";

type ProjectData = {
  project: { id: string; title: string; createdAt: Date | string };
  file: { fileType: string; fileUrl: string } | null;
  total: number;
  open: number;
};

export function ProjectList({ initialCards }: { initialCards: ProjectData[] }) {
  const [cards, setCards] = useState(initialCards);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [toast, setToast] = useState<{
    message: string;
    durationMs?: number;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);
  const pendingRef = useRef<{ timer: number; commit: () => void } | null>(null);

  // Deletion runs after a short undo window; the API call only fires when the
  // window elapses (or a newer delete flushes it).
  const handleDelete = () => {
    if (!deletingId) return;
    const id = deletingId;
    setDeletingId(null);

    const pending = pendingRef.current;
    if (pending) {
      window.clearTimeout(pending.timer);
      pendingRef.current = null;
      pending.commit();
    }

    const snapshot = cards;
    setCards((prev) => prev.filter((c) => c.project.id !== id));

    const commit = () => {
      deleteProject(id).catch(() => {
        setCards(snapshot);
        setToast({ message: "Couldn't delete the project — restored.", durationMs: 3000 });
      });
    };
    const timer = window.setTimeout(() => {
      pendingRef.current = null;
      setToast(null);
      commit();
    }, 6000);
    pendingRef.current = { timer, commit };

    setToast({
      message: "Project deleted.",
      durationMs: 0,
      actionLabel: "Undo",
      onAction: () => {
        window.clearTimeout(timer);
        pendingRef.current = null;
        setCards(snapshot);
        setToast(null);
      },
    });
  };

  const commitRename = async () => {
    const id = editingId;
    const title = editTitle.trim();
    setEditingId(null);
    if (!id) return;
    const before = cards.find((c) => c.project.id === id)?.project.title;
    if (!title || title === before) return;
    setCards((prev) =>
      prev.map((c) =>
        c.project.id === id ? { ...c, project: { ...c.project, title } } : c,
      ),
    );
    try {
      await updateProject(id, title);
    } catch {
      setCards((prev) =>
        prev.map((c) =>
          c.project.id === id
            ? { ...c, project: { ...c.project, title: before ?? title } }
            : c,
        ),
      );
      setToast({ message: "Couldn't rename the project.", durationMs: 3000 });
    }
  };

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
        <p className="text-zinc-500">You haven&apos;t shared any schematics yet.</p>
        <Link
          href="/"
          className="mt-3 inline-block font-medium text-indigo-600 hover:underline"
        >
          Upload your first one →
        </Link>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const visible = cards.filter((c) => {
    const matchesSearch = !q || c.project.title.toLowerCase().includes(q);
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "open"
          ? c.open > 0
          : c.total > 0 && c.open === 0;
    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div className="flex items-center gap-1.5">
          {(["all", "open", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No projects match your search or filter.
        </p>
      ) : (
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(({ project, file, total, open }) => (
          <li key={project.id} className="group relative">
            <Link
              href={`/project/${project.id}`}
              className="block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="grid h-40 place-items-center overflow-hidden border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                {file && file.fileType !== "pdf" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.fileUrl}
                    alt={project.title}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="text-3xl font-semibold text-zinc-300">
                    {file ? file.fileType.toUpperCase() : "—"}
                  </span>
                )}
              </div>
              <div className="p-4">
                {editingId === project.id ? (
                  <input
                    autoFocus
                    value={editTitle}
                    onClick={(e) => e.preventDefault()}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setEditingId(null);
                      }
                    }}
                    onBlur={commitRename}
                    maxLength={100}
                    className="w-full rounded-md border border-indigo-400 bg-white px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-zinc-950"
                  />
                ) : (
                  <h2 className="truncate pr-2 font-medium text-zinc-900 dark:text-zinc-100">
                    {project.title}
                  </h2>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>
                    {total} comment{total === 1 ? "" : "s"}
                  </span>
                  {open > 0 && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {open} open
                    </span>
                  )}
                </div>
              </div>
            </Link>

            {editingId !== project.id && (
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setEditingId(project.id);
                    setEditTitle(project.title);
                  }}
                  title="Rename"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-zinc-500 shadow-sm ring-1 ring-black/5 backdrop-blur hover:text-indigo-600 dark:bg-zinc-900/90 dark:ring-white/10"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setDeletingId(project.id);
                  }}
                  title="Delete"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-zinc-500 shadow-sm ring-1 ring-black/5 backdrop-blur hover:text-red-500 dark:bg-zinc-900/90 dark:ring-white/10"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      )}

      {deletingId && (
        <ConfirmDialog
          title="Delete project?"
          description="This deletes the schematic and all its comments. You'll have a few seconds to undo."
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          durationMs={toast.durationMs}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
