"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  authorName: string | null;
  busy?: boolean;
  onSubmit: (body: string) => void;
  onCancel: () => void;
};

/** Compact popover for typing a brand-new comment at a freshly dropped pin. */
export default function PinComposer({ authorName, busy, onSubmit, onCancel }: Props) {
  const [body, setBody] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => ref.current?.focus());
  }, []);

  return (
    <div className="w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">
          {authorName ? `New comment as ${authorName}` : "New comment"}
        </span>
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="grid h-5 w-5 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
        >
          ✕
        </button>
      </div>
      <textarea
        ref={ref}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && body.trim()) {
            onSubmit(body.trim());
          }
          if (e.key === "Escape") onCancel();
        }}
        rows={3}
        maxLength={4000}
        placeholder="Add your feedback…"
        className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">⌘/Ctrl + Enter</span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={() => body.trim() && onSubmit(body.trim())}
            disabled={!body.trim() || busy}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Posting…" : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}
