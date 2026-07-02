"use client";

import type { ThreadDTO } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { statusOf, STATUS_LABEL, STATUS_BADGE, STATUS_PIN_BG } from "@/lib/status";
import Avatar from "./Avatar";

export type NumberedThread = ThreadDTO & { number: number };
export type ThreadFilter = "all" | "open" | "resolved" | "wontfix";

type Props = {
  threads: NumberedThread[];
  activeId: string | null;
  filter: ThreadFilter;
  onFilterChange: (f: ThreadFilter) => void;
  onSelect: (id: string) => void;
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
}: Props) {
  const counts = {
    all: threads.length,
    open: threads.filter((t) => statusOf(t) === "open").length,
    resolved: threads.filter((t) => statusOf(t) === "resolved").length,
    wontfix: threads.filter((t) => statusOf(t) === "wontfix").length,
  };

  const visible = threads
    .filter((t) => (filter === "all" ? true : statusOf(t) === filter))
    .sort((a, b) => {
      const ao = statusOf(a) === "open" ? 0 : 1;
      const bo = statusOf(b) === "open" ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return lastActivity(b) - lastActivity(a);
    });

  const tabs: { key: ThreadFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "open", label: "Open", count: counts.open },
    { key: "resolved", label: "Resolved", count: counts.resolved },
    { key: "wontfix", label: "Won't fix", count: counts.wontfix },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Comments
        </h2>
        <div className="mt-2 flex flex-wrap gap-1">
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
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                        {replies > 0 && (
                          <span>
                            {replies} {replies === 1 ? "reply" : "replies"}
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
    </div>
  );
}
