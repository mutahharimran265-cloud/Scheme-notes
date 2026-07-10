// A small, unobtrusive ad placeholder.
//
// This is INTENTIONALLY not wired to any ad network. To monetise, set up your
// own ad account (Google AdSense, Carbon Ads, EthicalAds, etc.) and drop their
// snippet in place of the placeholder box below — e.g. an AdSense `<ins>` tag
// plus its script, or a Carbon `<script async src=...>`. Keep the outer
// <aside aria-label="Advertisement"> so the slot stays labelled and accessible.
//
// Sizing here is a leaderboard-ish 90px tall, full width up to the app's max
// width, which maps cleanly to common responsive ad units.

export default function AdSlot({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-label="Advertisement"
      className={`mx-auto w-full max-w-5xl px-6 ${className}`}
    >
      <div className="flex min-h-[90px] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        {/* Replace this block with your ad-network code. */}
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Advertisement
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Ad slot — your ad network snippet goes here.
          </p>
        </div>
      </div>
    </aside>
  );
}
