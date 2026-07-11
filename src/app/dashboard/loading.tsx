// Shown instantly while the dashboard server-renders — no blank screen.
export default function Loading() {
  return (
    <main className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="text-sm text-zinc-500">Loading your projects…</p>
      </div>
    </main>
  );
}
