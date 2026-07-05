"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ThreadDTO } from "@/lib/types";
import { fetchThreads } from "@/lib/api";
import { statusOf, STATUS_LABEL, STATUS_PIN_BG, type CommentStatus } from "@/lib/status";
import type { RevisionSummary } from "./RevisionBar";

type RevisionWithFile = RevisionSummary & { fileId: string | null };

type Entry = {
  thread: ThreadDTO;
  revisionId: string;
  revisionName: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  revisions: RevisionWithFile[]; // newest first
  activeRevisionId: string;
  /** Live threads of the active revision (kept fresh by the workspace). */
  currentThreads: ThreadDTO[];
  onJump: (threadId: string) => void;
};

export default function CommandPalette({
  open,
  onClose,
  projectId,
  revisions,
  activeRevisionId,
  currentThreads,
  onJump,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CommentStatus>("all");
  const [revFilter, setRevFilter] = useState<string>("all");
  const [selected, setSelected] = useState(0);
  // Threads of non-active revisions, fetched lazily the first time the
  // palette opens (client-side after that — search stays instant + offline).
  const [otherThreads, setOtherThreads] = useState<Record<string, ThreadDTO[]>>({});
  const [loadingOthers, setLoadingOthers] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    setStatusFilter("all");
    setRevFilter("all");
    requestAnimationFrame(() => inputRef.current?.focus());

    const missing = revisions.filter(
      (r) => r.id !== activeRevisionId && r.fileId && !otherThreads[r.id],
    );
    if (missing.length === 0) return;
    let cancelled = false;
    setLoadingOthers(true);
    Promise.all(
      missing.map(async (r) => [r.id, await fetchThreads(r.fileId as string)] as const),
    )
      .then((pairs) => {
        if (cancelled) return;
        setOtherThreads((prev) => {
          const next = { ...prev };
          for (const [id, threads] of pairs) next[id] = threads;
          return next;
        });
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingOthers(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const entries: Entry[] = useMemo(() => {
    const byRev = (revId: string, threads: ThreadDTO[]) => {
      const rev = revisions.find((r) => r.id === revId);
      return threads.map((thread) => ({
        thread,
        revisionId: revId,
        revisionName: rev?.name ?? "?",
      }));
    };
    const all: Entry[] = byRev(activeRevisionId, currentThreads);
    for (const r of revisions) {
      if (r.id === activeRevisionId) continue;
      if (otherThreads[r.id]) all.push(...byRev(r.id, otherThreads[r.id]));
    }
    return all;
  }, [revisions, activeRevisionId, currentThreads, otherThreads]);

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const tagTokens = tokens.filter((t) => t.startsWith("#")).map((t) => t.slice(1));
    const textTokens = tokens.filter((t) => !t.startsWith("#"));

    return entries
      .filter((e) => {
        if (statusFilter !== "all" && statusOf(e.thread) !== statusFilter) return false;
        if (revFilter !== "all" && e.revisionId !== revFilter) return false;
        const tags = e.thread.tags.map((t) => t.toLowerCase());
        if (tagTokens.some((t) => !tags.some((tag) => tag.includes(t)))) return false;
        if (textTokens.length === 0) return true;
        const haystack = [
          e.thread.body,
          e.thread.authorName,
          e.thread.componentRef ?? "",
          e.thread.partNumber ?? "",
          tags.join(" "),
          ...e.thread.replies.map((r) => r.body),
        ]
          .join(" ")
          .toLowerCase();
        return textTokens.every((t) => haystack.includes(t));
      })
      .slice(0, 50);
  }, [entries, query, statusFilter, revFilter]);

  useEffect(() => setSelected(0), [query, statusFilter, revFilter]);

  if (!open) return null;

  function jump(entry: Entry) {
    onClose();
    if (entry.revisionId === activeRevisionId) {
      onJump(entry.thread.id);
    } else {
      router.push(
        `/project/${projectId}?rev=${entry.revisionId}&focus=${entry.thread.id}`,
      );
    }
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
            ref={inputRef}
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
          {revisions.length > 1 && (
            <select
              value={revFilter}
              onChange={(e) => setRevFilter(e.target.value)}
              className="ml-auto rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="all">All revisions</option>
              {revisions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="max-h-[46vh] overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">
              {loadingOthers ? "Loading other revisions…" : "No matching comments."}
            </p>
          ) : (
            <ul>
              {results.map((entry, i) => {
                const st = statusOf(entry.thread);
                return (
                  <li key={entry.thread.id}>
                    <button
                      onClick={() => jump(entry)}
                      onMouseEnter={() => setSelected(i)}
                      className={`flex w-full items-start gap-3 px-4 py-2.5 text-left ${
                        i === selected
                          ? "bg-indigo-50 dark:bg-indigo-950/30"
                          : ""
                      }`}
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_PIN_BG[st]}`}
                        title={STATUS_LABEL[st]}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-zinc-800 dark:text-zinc-100">
                          {entry.thread.body}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                          <span>{entry.thread.authorName}</span>
                          {entry.thread.componentRef && (
                            <span className="font-mono text-zinc-500">
                              {entry.thread.componentRef}
                            </span>
                          )}
                          {entry.thread.tags.map((t) => (
                            <span key={t} className="text-indigo-500">
                              #{t}
                            </span>
                          ))}
                          <span className="ml-auto rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-500 dark:bg-zinc-800">
                            {entry.revisionName}
                          </span>
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
