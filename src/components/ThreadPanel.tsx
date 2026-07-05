"use client";

import { useRef, useState } from "react";
import type { CommentDTO, ThreadDTO } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { imageFromClipboard, uploadPastedImage, insertAtCursor } from "@/lib/paste";
import CommentBody from "./CommentBody";
import {
  statusOf,
  STATUS_LABEL,
  STATUS_PIN_BG,
  type CommentStatus,
} from "@/lib/status";
import Avatar from "./Avatar";

type Props = {
  thread: ThreadDTO;
  pinNumber: number;
  authorName: string | null;
  busy?: boolean;
  onReply: (body: string) => void;
  onSetStatus: (status: CommentStatus) => void;
  onEdit: (commentId: string, body: string) => void;
  onDelete: (commentId: string) => void;
  onClose: () => void;
};

export default function ThreadPanel({
  thread,
  pinNumber,
  busy,
  onReply,
  onSetStatus,
  onEdit,
  onDelete,
  onClose,
}: Props) {
  const [reply, setReply] = useState("");
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const [pasting, setPasting] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const status = statusOf(thread);

  async function onReplyPaste(e: React.ClipboardEvent) {
    const img = imageFromClipboard(e);
    if (!img) return;
    e.preventDefault();
    setPasting(true);
    setPasteError(null);
    try {
      const url = await uploadPastedImage(img);
      const { next, caret } = insertAtCursor(replyRef.current, reply, `![image](${url})`);
      setReply(next);
      requestAnimationFrame(() => replyRef.current?.setSelectionRange(caret, caret));
    } catch (err) {
      setPasteError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setPasting(false);
    }
  }

  return (
    <div className="flex max-h-[70vh] w-80 flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
        <span
          className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold text-white ${STATUS_PIN_BG[status]}`}
        >
          {pinNumber}
        </span>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {STATUS_LABEL[status]}
        </span>
        {thread.carriedFromId && (
          <span
            className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-950 dark:text-violet-300"
            title="Carried over from an earlier revision"
          >
            Carried
          </span>
        )}
        <button
          onClick={onClose}
          aria-label="Close"
          className="ml-auto grid h-6 w-6 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
        >
          ✕
        </button>
      </div>

      {/* Status actions */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
        {status === "open" && (
          <>
            <StatusButton tone="sky" disabled={busy} onClick={() => onSetStatus("in_review")}>
              In review
            </StatusButton>
            <StatusButton tone="emerald" disabled={busy} onClick={() => onSetStatus("resolved")}>
              ✓ Resolve
            </StatusButton>
            <StatusButton tone="amber" disabled={busy} onClick={() => onSetStatus("wontfix")}>
              Won&apos;t fix
            </StatusButton>
          </>
        )}
        {status === "in_review" && (
          <>
            <StatusButton tone="emerald" disabled={busy} onClick={() => onSetStatus("resolved")}>
              ✓ Resolve
            </StatusButton>
            <StatusButton tone="amber" disabled={busy} onClick={() => onSetStatus("wontfix")}>
              Won&apos;t fix
            </StatusButton>
            <StatusButton tone="zinc" disabled={busy} onClick={() => onSetStatus("open")}>
              ↩ Reopen
            </StatusButton>
          </>
        )}
        {(status === "resolved" || status === "wontfix") && (
          <StatusButton tone="zinc" disabled={busy} onClick={() => onSetStatus("open")}>
            ↩ Reopen
          </StatusButton>
        )}
      </div>

      {/* Engineer metadata: component link + tags */}
      {(thread.componentRef || thread.partNumber || thread.datasheetUrl || thread.tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 px-3 py-2 text-xs dark:border-zinc-800">
          {thread.componentRef && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {thread.componentRef}
            </span>
          )}
          {thread.partNumber && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {thread.partNumber}
            </span>
          )}
          {thread.datasheetUrl && (
            <a
              href={thread.datasheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Datasheet ↗
            </a>
          )}
          {thread.tags.map((t) => (
            <span key={t} className="text-indigo-500">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Comments */}
      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <CommentItem comment={thread} onEdit={onEdit} onDelete={onDelete} />
        {thread.replies.map((r) => (
          <CommentItem key={r.id} comment={r} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>

      {/* Reply box */}
      <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
        <textarea
          ref={replyRef}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onPaste={onReplyPaste}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && reply.trim()) {
              onReply(reply.trim());
              setReply("");
            }
          }}
          rows={2}
          maxLength={4000}
          placeholder="Reply… (markdown + pasted images supported)"
          className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        {pasting && (
          <p className="mt-1 text-xs text-zinc-400">Uploading image…</p>
        )}
        {pasteError && (
          <p className="mt-1 text-xs text-red-600">{pasteError}</p>
        )}
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => {
              if (reply.trim()) {
                onReply(reply.trim());
                setReply("");
              }
            }}
            disabled={!reply.trim() || busy}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusButton({
  children,
  tone,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  tone: "emerald" | "amber" | "zinc" | "sky";
  disabled?: boolean;
  onClick: () => void;
}) {
  const tones: Record<string, string> = {
    emerald:
      "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40",
    amber:
      "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950/40",
    sky: "border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-900 dark:text-sky-400 dark:hover:bg-sky-950/40",
    zinc: "border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function CommentItem({
  comment,
  onEdit,
  onDelete,
}: {
  comment: CommentDTO;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const [pasting, setPasting] = useState(false);

  async function onDraftPaste(e: React.ClipboardEvent) {
    const img = imageFromClipboard(e);
    if (!img) return;
    e.preventDefault();
    setPasting(true);
    try {
      const url = await uploadPastedImage(img);
      const { next, caret } = insertAtCursor(draftRef.current, draft, `![image](${url})`);
      setDraft(next);
      requestAnimationFrame(() => draftRef.current?.setSelectionRange(caret, caret));
    } catch {
      // keep the draft untouched; the user can retry the paste
    } finally {
      setPasting(false);
    }
  }

  return (
    <div className="group flex gap-2">
      <Avatar name={comment.authorName} size={26} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {comment.authorName}
          </span>
          <time className="text-xs text-zinc-400" suppressHydrationWarning>
            {timeAgo(comment.createdAt)}
          </time>
          {comment.isOwn && !editing && (
            <div className="ml-auto hidden items-center gap-1 group-hover:flex">
              <button
                onClick={() => {
                  setDraft(comment.body);
                  setEditing(true);
                }}
                className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-zinc-400 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-1">
            <textarea
              ref={draftRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPaste={onDraftPaste}
              rows={2}
              maxLength={4000}
              className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
            {pasting && <p className="mt-1 text-xs text-zinc-400">Uploading image…</p>}
            <div className="mt-1 flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const t = draft.trim();
                  if (t) {
                    onEdit(comment.id, t);
                    setEditing(false);
                  }
                }}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <CommentBody body={comment.body} />
        )}
      </div>
    </div>
  );
}
