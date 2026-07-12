"use client";

import type { ThreadDTO } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import {
  statusOf,
  isOutstanding,
  STATUS_LABEL,
  STATUS_BADGE,
  STATUS_PIN_BG,
} from "@/lib/status";
import Avatar from "./Avatar";

export type NumberedThread = ThreadDTO & { number: number };
export type ThreadFilter = "all" | "open" | "in_review" | "resolved" | "wontfix";

type Props = {
  threads: NumberedThread[];
  activeId: string | null;
  filter: ThreadFilter;
  onFilterChange: (f: ThreadFilter) => void;
  onSelect: (id: string) => void;
  onExport: () => void;
  onDownloadPdf: () => void;
};

function lastActivity(t: ThreadDTO): number {
  const times = [t.updatedAt, t.createdAt, ...t.replies.map((r) => r.updatedAt)];
  return Math.max(...times.map((x) => new Date(x).getTime()));
}

export default function CommentSidebar({
  threads,
  activeId,
  filter,
  onFilterChange,
  onSelect,
  onExport,
  onDownloadPdf,
}: Props) {
  const counts = {
    all: threads.length,
    open: threads.filter((t) => statusOf(t) === "open").length,
    in_review: threads.filter((t) => statusOf(t) === "in_review").length,
    resolved: threads.filter((t) => statusOf(t) === "resolved").length,
    wontfix: threads.filter((t) => statusOf(t) === "wontfix").length,
  };
  const total = threads.length;
  // Addressed = resolved or won't-fix; in-review still needs attention.
  const addressed = counts.resolved + counts.wontfix;
  const pct = total ? Math.round((addressed / total) * 100) : 0;

  const visible = threads
    .filter((t) => (filter === "all" ? true : statusOf(t) === filter))
    .sort((a, b) => {
      const ao = isOutstanding(a) ? 0 : 1;
      const bo = isOutstanding(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return lastActivity(b) - lastActivity(a);
    });

  const tabs: { key: ThreadFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "open", label: "Open", count: counts.open },
    { key: "in_review", label: "In review", count: counts.in_review },
    { key: "resolved", label: "Resolved", count: counts.resolved },
    { key: "wontfix", label: "Won't fix", count: counts.wontfix },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Comments
          </h2>
          <div className="flex items-center gap-0.5">
            <button
              onClick={onDownloadPdf}
              title="Download the schematic with its comments as a PDF"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3v4a1 1 0 0 0 1 1h4M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
              </svg>
              PDF
            </button>
            <button
              onClick={onExport}
              title="Copy the review as a Markdown checklist"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M8 5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2M8 5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2" />
              </svg>
              Copy list
            </button>
          </div>
        </div>

        {total > 0 && (
          <div className="mt-2.5">
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>
                {addressed} of {total} addressed
              </span>
              <span>{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === tab.key
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {tab.label}{" "}
              {tab.count > 0 && <span className="opacity-70">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-400">
            {threads.length === 0
              ? "No comments yet. Click anywhere on the schematic to leave one."
              : "Nothing here with this filter."}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visible.map((t) => {
              const st = statusOf(t);
              const replies = t.replies.length;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => onSelect(t.id)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition-colors ${
                      activeId === t.id
                        ? "bg-indigo-50 dark:bg-indigo-950/30"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold text-white ${STATUS_PIN_BG[st]}`}
                    >
                      {t.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Avatar name={t.authorName} size={18} />
                        <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
                          {t.authorName}
                        </span>
                        <time
                          className="ml-auto shrink-0 text-[11px] text-zinc-400"
                          suppressHydrationWarning
                        >
                          {timeAgo(t.createdAt)}
                        </time>
                      </div>
                      <p
                        className={`mt-1 line-clamp-2 text-sm ${
                          st === "open"
                            ? "text-zinc-600 dark:text-zinc-300"
                            : "text-zinc-400"
                        }`}
                      >
                        {t.body}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                        {replies > 0 && (
                          <span>
                            {replies} {replies === 1 ? "reply" : "replies"}
                          </span>
                        )}
                        {t.componentRef && (
                          <span className="rounded bg-zinc-100 px-1 py-0.5 font-mono font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {t.componentRef}
                          </span>
                        )}
                        {st !== "open" && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 font-medium ${STATUS_BADGE[st]}`}
                          >
                            {STATUS_LABEL[st]}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="hidden shrink-0 flex-wrap items-center gap-1.5 border-t border-zinc-200 px-4 py-2 text-[11px] text-zinc-400 lg:flex dark:border-zinc-800">
        <Kbd>J</Kbd>
        <Kbd>K</Kbd>
        <span>navigate</span>
        <span className="mx-1 opacity-40">·</span>
        <Kbd>R</Kbd>
        <span>resolve</span>
        <span className="mx-1 opacity-40">·</span>
        <Kbd>Ctrl K</Kbd>
        <span>search</span>
        <span className="mx-1 opacity-40">·</span>
        <Kbd>Esc</Kbd>
        <span>close</span>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
      {children}
    </kbd>
  );
}
