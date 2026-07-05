"use client";

import { useEffect, useMemo, useState } from "react";
import type { ThreadDTO } from "@/lib/types";
import { statusOf, STATUS_LABEL, STATUS_PIN_BG, type CommentStatus } from "@/lib/status";

type Props = {
  open: boolean;
  onClose: () => void;
  threads: ThreadDTO[];
  onJump: (threadId: string) => void;
};

export default function CommandPalette({ open, onClose, threads, onJump }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CommentStatus>("all");
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    setStatusFilter("all");
  }, [open]);

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const tagTokens = tokens.filter((t) => t.startsWith("#")).map((t) => t.slice(1));
    const textTokens = tokens.filter((t) => !t.startsWith("#"));

    return threads
      .filter((t) => {
        if (statusFilter !== "all" && statusOf(t) !== statusFilter) return false;
        const tags = t.tags.map((tag) => tag.toLowerCase());
        if (tagTokens.some((q) => !tags.some((tag) => tag.includes(q)))) return false;
        if (textTokens.length === 0) return true;
        const haystack = [
          t.body,
          t.authorName,
          t.componentRef ?? "",
          t.partNumber ?? "",
          tags.join(" "),
          ...t.replies.map((r) => r.body),
        ]
          .join(" ")
          .toLowerCase();
        return textTokens.every((q) => haystack.includes(q));
      })
      .slice(0, 50);
  }, [threads, query, statusFilter]);

  useEffect(() => setSelected(0), [query, statusFilter]);

  if (!open) return null;

  function jump(t: ThreadDTO) {
    onClose();
    onJump(t.id);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      e.preventDefault();
      jump(results[selected]);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 dark:border-zinc-800">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 stroke-zinc-400 stroke-2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search comments… (#tag to filter by tag)"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-zinc-400"
          />
          <kbd className="shrink-0 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
            Esc
          </kbd>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
          {(["all", "open", "in_review", "resolved", "wontfix"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="max-h-[46vh] overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">No matching comments.</p>
          ) : (
            <ul>
              {results.map((t, i) => {
                const st = statusOf(t);
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => jump(t)}
                      onMouseEnter={() => setSelected(i)}
                      className={`flex w-full items-start gap-3 px-4 py-2.5 text-left ${
                        i === selected ? "bg-indigo-50 dark:bg-indigo-950/30" : ""
                      }`}
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_PIN_BG[st]}`}
                        title={STATUS_LABEL[st]}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-zinc-800 dark:text-zinc-100">
                          {t.body}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                          <span>{t.authorName}</span>
                          {t.componentRef && (
                            <span className="font-mono text-zinc-500">{t.componentRef}</span>
                          )}
                          {t.tags.map((tag) => (
                            <span key={tag} className="text-indigo-500">
                              #{tag}
                            </span>
                          ))}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
