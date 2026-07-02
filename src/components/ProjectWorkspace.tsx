"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThreadDTO } from "@/lib/types";
import {
  createReply,
  createThread,
  deleteComment,
  editComment,
  fetchThreads,
  setStatus,
} from "@/lib/api";
import { statusOf, type CommentStatus } from "@/lib/status";
import { getDisplayName, setDisplayName } from "@/lib/identity";
import SchematicViewer from "./SchematicViewer";
import CommentSidebar, { type ThreadFilter } from "./CommentSidebar";
import PinComposer from "./PinComposer";
import ThreadPanel from "./ThreadPanel";
import NameModal from "./NameModal";
import { Toast } from "./Toast";

type Props = {
  fileId: string;
  fileUrl: string;
  fileType: string;
  initialThreads: ThreadDTO[];
};

export default function ProjectWorkspace({
  fileId,
  fileUrl,
  fileType,
  initialThreads,
}: Props) {
  const [threads, setThreads] = useState<ThreadDTO[]>(initialThreads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null);
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const [name, setName] = useState<string | null>(null);
  const [nameModal, setNameModal] = useState<{
    open: boolean;
    run?: (name: string) => void;
  }>({ open: false });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const numbered = threads.map((t, i) => ({ ...t, number: i + 1 }));
  const pins = numbered
    .filter((t) => t.xPercent != null && t.yPercent != null)
    .map((t) => ({
      id: t.id,
      x: t.xPercent as number,
      y: t.yPercent as number,
      number: t.number,
      status: statusOf(t),
    }));
  const activeThread = numbered.find((t) => t.id === activeId) ?? null;
  const openCount = threads.filter((t) => !t.resolved).length;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load identity + refresh threads (to pick up ownership flags) on mount.
  useEffect(() => {
    setName(getDisplayName());
    fetchThreads(fileId)
      .then(setThreads)
      .catch(() => {});
  }, [fileId]);

  // Escape closes any open popover.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDraftPin(null);
        setActiveId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function withName(run: (name: string) => void) {
    if (name) run(name);
    else setNameModal({ open: true, run });
  }

  function onNameSubmit(newName: string) {
    setDisplayName(newName);
    setName(newName);
    const run = nameModal.run;
    setNameModal({ open: false });
    run?.(newName);
  }

  function handleCanvasClick(x: number, y: number) {
    if (draftPin || activeId) {
      setDraftPin(null);
      setActiveId(null);
      return;
    }
    setDraftPin({ x, y });
  }

  function handleSelectPin(id: string) {
    setDraftPin(null);
    setActiveId(id);
  }

  function handleCreateThread(body: string) {
    if (!draftPin) return;
    const pin = draftPin;
    withName(async (author) => {
      setBusy(true);
      try {
        const created = await createThread({
          schematicFileId: fileId,
          authorName: author,
          body,
          xPercent: pin.x,
          yPercent: pin.y,
        });
        setThreads((prev) => [...prev, { ...created, replies: [] }]);
        setDraftPin(null);
        setActiveId(created.id);
      } catch (e) {
        flash(e instanceof Error ? e.message : "Could not post comment.");
      } finally {
        setBusy(false);
      }
    });
  }

  function handleReply(threadId: string, body: string) {
    withName(async (author) => {
      setBusy(true);
      try {
        const reply = await createReply({
          schematicFileId: fileId,
          parentCommentId: threadId,
          authorName: author,
          body,
        });
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, replies: [...t.replies, reply] } : t,
          ),
        );
      } catch (e) {
        flash(e instanceof Error ? e.message : "Could not post reply.");
      } finally {
        setBusy(false);
      }
    });
  }

  async function handleSetStatus(threadId: string, status: CommentStatus) {
    const target = threads.find((t) => t.id === threadId);
    if (!target) return;
    const prevStatus = statusOf(target);
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, status, resolved: status !== "open" } : t,
      ),
    );
    try {
      await setStatus(threadId, status);
    } catch (e) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? { ...t, status: prevStatus, resolved: prevStatus !== "open" }
            : t,
        ),
      );
      flash(e instanceof Error ? e.message : "Could not update.");
    }
  }

  async function handleEdit(commentId: string, body: string) {
    try {
      const updated = await editComment(commentId, body);
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === commentId) return { ...t, body: updated.body };
          return {
            ...t,
            replies: t.replies.map((r) =>
              r.id === commentId ? { ...r, body: updated.body } : r,
            ),
          };
        }),
      );
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not edit.");
    }
  }

  async function handleDelete(commentId: string) {
    const isRoot = threads.some((t) => t.id === commentId);
    if (isRoot && !window.confirm("Delete this comment and all its replies?")) {
      return;
    }
    try {
      await deleteComment(commentId);
      if (isRoot) {
        setThreads((prev) => prev.filter((t) => t.id !== commentId));
        if (activeId === commentId) setActiveId(null);
      } else {
        setThreads((prev) =>
          prev.map((t) => ({
            ...t,
            replies: t.replies.filter((r) => r.id !== commentId),
          })),
        );
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not delete.");
    }
  }

  const overlay = draftPin ? (
    <PinComposer
      authorName={name}
      busy={busy}
      onSubmit={handleCreateThread}
      onCancel={() => setDraftPin(null)}
    />
  ) : activeThread ? (
    <ThreadPanel
      thread={activeThread}
      pinNumber={activeThread.number}
      authorName={name}
      busy={busy}
      onReply={(body) => handleReply(activeThread.id, body)}
      onSetStatus={(status) => handleSetStatus(activeThread.id, status)}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onClose={() => setActiveId(null)}
    />
  ) : null;

  return (
    <div className="flex h-full min-h-0">
      {/* Viewer */}
      <div className="relative min-w-0 flex-1">
        <SchematicViewer
          fileUrl={fileUrl}
          fileType={fileType}
          pins={pins}
          activeId={activeId}
          draftPin={draftPin}
          overlay={overlay}
          onCanvasClick={handleCanvasClick}
          onSelectPin={handleSelectPin}
        />

        {/* Hint + mobile comments toggle */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
          <span className="rounded-full bg-zinc-900/80 px-3 py-1 text-xs text-white shadow-sm">
            Click anywhere on the schematic to comment
          </span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="absolute bottom-3 right-3 z-10 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg lg:hidden"
        >
          Comments ({openCount} open)
        </button>
      </div>

      {/* Sidebar (desktop) */}
      <aside className="hidden w-80 shrink-0 border-l border-zinc-200 bg-white lg:block dark:border-zinc-800 dark:bg-zinc-900">
        <CommentSidebar
          threads={numbered}
          activeId={activeId}
          filter={filter}
          onFilterChange={setFilter}
          onSelect={handleSelectPin}
        />
      </aside>

      {/* Sidebar (mobile drawer) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="absolute right-0 top-0 flex h-full w-80 max-w-[85%] flex-col bg-white shadow-xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <span className="text-sm font-semibold">Comments</span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
                className="grid h-7 w-7 place-items-center rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <CommentSidebar
                threads={numbered}
                activeId={activeId}
                filter={filter}
                onFilterChange={setFilter}
                onSelect={(id) => {
                  handleSelectPin(id);
                  setDrawerOpen(false);
                }}
              />
            </div>
          </aside>
        </div>
      )}

      <NameModal
        open={nameModal.open}
        initialName={name}
        title="Add your name to comment"
        onSubmit={onNameSubmit}
        onCancel={() => setNameModal({ open: false })}
      />

      {toast && (
        <Toast message={toast} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
