"use client";

import Link from "next/link";
import { useState } from "react";
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
  const [toast, setToast] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    const id = deletingId;
    setDeletingId(null);
    try {
      await deleteProject(id);
      setCards((prev) => prev.filter((c) => c.project.id !== id));
    } catch {
      setToast("Couldn't delete the project.");
    }
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
      setToast("Couldn't rename the project.");
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

  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ project, file, total, open }) => (
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

      {deletingId && (
        <ConfirmDialog
          title="Delete project?"
          description="This will permanently delete the schematic and all comments. This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
