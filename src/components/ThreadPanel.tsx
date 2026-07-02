"use client";

import { useState } from "react";
import type { CommentDTO, ThreadDTO } from "@/lib/types";
import { timeAgo } from "@/lib/format";
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
  const status = statusOf(thread);

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
        <button
          onClick={onClose}
          aria-label="Close"
          className="ml-auto grid h-6 w-6 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
        >
          ✕
        </button>
      </div>

      {/* Status actions */}
      <div className="flex items-center gap-1.5 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
        {status === "open" ? (
          <>
            <StatusButton tone="emerald" disabled={busy} onClick={() => onSetStatus("resolved")}>
              ✓ Resolve
            </StatusButton>
            <StatusButton tone="amber" disabled={busy} onClick={() => onSetStatus("wontfix")}>
              Won&apos;t fix
            </StatusButton>
          </>
        ) : (
          <StatusButton tone="zinc" disabled={busy} onClick={() => onSetStatus("open")}>
            ↩ Reopen
          </StatusButton>
        )}
      </div>

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
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && reply.trim()) {
              onReply(reply.trim());
              setReply("");
            }
          }}
          rows={2}
          maxLength={4000}
          placeholder="Reply…"
          className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
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
  tone: "emerald" | "amber" | "zinc";
  disabled?: boolean;
  onClick: () => void;
}) {
  const tones: Record<string, string> = {
    emerald:
      "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40",
    amber:
      "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950/40",
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
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              maxLength={4000}
              className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
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
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-zinc-700 dark:text-zinc-200">
            {comment.body}
          </p>
        )}
      </div>
    </div>
  );
}
