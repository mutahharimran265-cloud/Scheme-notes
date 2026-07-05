// A styled, static preview of the review UI for the landing hero — makes the
// product look real without needing a live screenshot. Pure markup (no JS).

function Pin({
  x,
  y,
  n,
  tone,
  ping,
}: {
  x: number;
  y: number;
  n: number;
  tone: "indigo" | "emerald";
  ping?: boolean;
}) {
  const bg = tone === "emerald" ? "bg-emerald-600" : "bg-indigo-600";
  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {ping && (
        <span className={`ping-ring absolute inset-0 rounded-full ${bg}`} />
      )}
      <span
        className={`relative grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold text-white shadow-md ring-2 ring-white ${bg}`}
      >
        {n}
      </span>
    </span>
  );
}

export default function HeroPreview() {
  return (
    <div className="rise-3 mx-auto mt-12 max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_2px_8px_rgba(16,24,40,.05),0_40px_80px_-40px_rgba(30,27,75,.45)] dark:border-white/[0.1] dark:bg-zinc-900">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-black/[0.06] bg-zinc-50 px-4 py-2.5 dark:border-white/[0.08] dark:bg-zinc-950/60">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </span>
          <span className="ml-2 truncate font-display text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            Power supply — rev B
          </span>
          <span className="rounded bg-zinc-200/70 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500 dark:bg-zinc-800">
            SVG
          </span>
          <span className="ml-auto rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white">
            Comments · 2 open
          </span>
        </div>

        {/* Canvas */}
        <div className="relative bp-grid aspect-[16/8]">
          <svg
            viewBox="0 0 400 200"
            className="absolute inset-0 h-full w-full p-4 text-zinc-700 dark:text-zinc-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {/* battery / source */}
            <line x1="40" y1="40" x2="40" y2="160" strokeWidth="3" />
            <line x1="30" y1="85" x2="50" y2="85" strokeWidth="3" />
            <line x1="34" y1="105" x2="46" y2="105" strokeWidth="3" />
            {/* top rail + R1 zigzag */}
            <line x1="40" y1="40" x2="120" y2="40" />
            <polyline points="120,40 128,28 140,52 152,28 164,52 176,40" />
            <line x1="176" y1="40" x2="250" y2="40" />
            {/* to cap + node */}
            <line x1="250" y1="40" x2="250" y2="90" />
            <line x1="235" y1="90" x2="265" y2="90" />
            <line x1="235" y1="102" x2="265" y2="102" />
            <line x1="250" y1="102" x2="250" y2="150" />
            {/* U/LED block */}
            <rect x="290" y="60" width="70" height="52" rx="3" />
            <line x1="250" y1="40" x2="325" y2="40" />
            <line x1="325" y1="40" x2="325" y2="60" />
            {/* ground rail */}
            <line x1="40" y1="160" x2="325" y2="160" />
            <line x1="325" y1="112" x2="325" y2="160" />
            <line x1="140" y1="160" x2="160" y2="160" strokeWidth="3" />
            <line x1="145" y1="168" x2="155" y2="168" strokeWidth="3" />
          </svg>

          <Pin x={37} y={20} n={1} tone="indigo" ping />
          <Pin x={62} y={48} n={2} tone="indigo" />
          <Pin x={10} y={50} n={3} tone="emerald" />

          {/* Floating comment card */}
          <div className="floaty absolute bottom-3 right-3 w-[62%] max-w-[260px] rounded-xl border border-black/[0.08] bg-white p-3 shadow-xl dark:border-white/[0.1] dark:bg-zinc-800">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#b8506e] text-[11px] font-semibold text-white">
                P
              </span>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                Priya
              </span>
              <span className="text-[10px] text-zinc-400">2m</span>
              <span className="ml-auto rounded-md border border-emerald-200 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:border-emerald-900">
                Resolve
              </span>
            </div>
            <p className="mt-1.5 text-[13px] leading-snug text-zinc-600 dark:text-zinc-300">
              R1 = 1k gives ~8&nbsp;mA into D1 — a touch bright. Try 1.5k?
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
                R1
              </span>
              <span className="text-[10px] text-indigo-500">#power</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
