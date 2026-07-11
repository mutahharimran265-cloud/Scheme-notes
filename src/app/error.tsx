"use client";

// Route-level error boundary. Catches render/runtime errors in any page and
// shows a recovery screen instead of a blank white page. Data is never lost —
// this only affects the current view.
import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <main className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-foreground/60">
          An unexpected error occurred while loading this view. Your projects and comments are
          safe — try again, or head back home.
        </p>
        {error?.digest && (
          <p className="mt-2 font-mono text-xs text-foreground/40">Ref: {error.digest}</p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
