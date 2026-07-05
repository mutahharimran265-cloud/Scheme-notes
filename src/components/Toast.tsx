"use client";

import { useEffect } from "react";

type Props = {
  message: string;
  onClose: () => void;
  /** Auto-dismiss delay. Pass 0 to keep the toast until closed by the caller. */
  durationMs?: number;
  /** Optional action (e.g. "Undo") rendered as a button inside the toast. */
  actionLabel?: string;
  onAction?: () => void;
};

export function Toast({
  message,
  onClose,
  durationMs = 3000,
  actionLabel,
  onAction,
}: Props) {
  useEffect(() => {
    if (!durationMs) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [onClose, durationMs, message]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 rounded-xl bg-zinc-900/90 px-4 py-2.5 text-sm font-medium text-white shadow-xl backdrop-blur-md dark:bg-white/90 dark:text-zinc-900">
        <span className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 stroke-current stroke-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {message}
        </span>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="shrink-0 rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-white/25 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/20"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
