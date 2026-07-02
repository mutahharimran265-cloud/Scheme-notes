"use client";

import { useEffect } from "react";

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 rounded-xl bg-zinc-900/90 px-4 py-2.5 text-sm font-medium text-white shadow-xl backdrop-blur-md dark:bg-white/90 dark:text-zinc-900">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 stroke-current stroke-2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {message}
      </div>
    </div>
  );
}
