// Shown instantly while a project server-renders — no blank screen.
export default function Loading() {
  return (
    <main className="grid h-[calc(100dvh-3.5rem)] place-items-center bp-grid">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="text-sm text-zinc-500">Loading schematic…</p>
      </div>
    </main>
  );
}
