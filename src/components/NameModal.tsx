"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  initialName?: string | null;
  title?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

export default function NameModal({
  open,
  initialName,
  title = "What's your name?",
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialName ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(initialName ?? "");
      // Focus after the modal paints.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, initialName]);

  if (!open) return null;

  function submit() {
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Shown next to your comments. No account needed.
        </p>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          maxLength={60}
          placeholder="e.g. Alex Chen"
          className="mt-4 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
