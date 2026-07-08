"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { Toast } from "./Toast";

type TokenRow = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
};

/**
 * Personal API tokens for scripting the REST API (see docs/API.md).
 * Scriptable access is a Pro feature; `enabled` reflects the active plan and,
 * when false, the section renders an upgrade prompt instead of the manager.
 */
export default function ApiTokens({ enabled = true }: { enabled?: boolean }) {
  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    durationMs?: number;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);
  const pendingRef = useRef<{ timer: number; commit: () => void } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    fetch("/api/tokens")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Could not load tokens.");
        setTokens(data.tokens);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Could not load tokens."));
  }, [enabled]);

  async function create() {
    setCreating(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || "API token" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not create the token.");
      setTokens((prev) => [
        { id: data.id, label: data.label, createdAt: new Date().toISOString(), lastUsedAt: null },
        ...(prev ?? []),
      ]);
      setCreatedSecret(data.token);
      setLabel("");
    } catch (e) {
      setToast({
        message: e instanceof Error ? e.message : "Could not create the token.",
        durationMs: 3000,
      });
    } finally {
      setCreating(false);
    }
  }

  function revoke() {
    const id = confirmId;
    setConfirmId(null);
    if (!id || !tokens) return;

    const pending = pendingRef.current;
    if (pending) {
      window.clearTimeout(pending.timer);
      pendingRef.current = null;
      pending.commit();
    }

    const snapshot = tokens;
    setTokens(tokens.filter((t) => t.id !== id));
    const commit = () => {
      fetch(`/api/tokens/${id}`, { method: "DELETE" }).catch(() => {
        setTokens(snapshot);
        setToast({ message: "Couldn't revoke the token — restored.", durationMs: 3000 });
      });
    };
    const timer = window.setTimeout(() => {
      pendingRef.current = null;
      setToast(null);
      commit();
    }, 6000);
    pendingRef.current = { timer, commit };
    setToast({
      message: "Token revoked.",
      durationMs: 0,
      actionLabel: "Undo",
      onAction: () => {
        window.clearTimeout(timer);
        pendingRef.current = null;
        setTokens(snapshot);
        setToast(null);
      },
    });
  }

  if (!enabled) {
    return (
      <section className="mt-12">
        <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          API tokens
          <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 align-middle text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
            Pro
          </span>
        </h2>
        <div className="mt-3 max-w-2xl rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <p className="text-zinc-700 dark:text-zinc-200">
            Script annotation from a bring-up rig or CI with{" "}
            <code className="rounded bg-white px-1 py-0.5 text-xs dark:bg-zinc-900">
              Authorization: Bearer sn_…
            </code>{" "}
            requests. Scriptable API access is part of the Pro plan.
          </p>
          <a
            href="/#pricing"
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            See plans →
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-12">
      <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        API tokens
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">
        Script annotation creation from a test rig or CI — see{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
          docs/API.md
        </code>{" "}
        in the project folder. Requests with{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
          Authorization: Bearer sn_…
        </code>{" "}
        skip rate limits and own the comments they create.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
          placeholder="Token label (e.g. bringup-rig)"
          className="w-64 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          onClick={create}
          disabled={creating}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create token"}
        </button>
      </div>

      {createdSecret && (
        <div className="mt-3 max-w-2xl rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            Copy this token now — it won&apos;t be shown again:
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1 font-mono text-xs dark:bg-zinc-900">
              {createdSecret}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdSecret).catch(() => {});
                setToast({ message: "Token copied.", durationMs: 2000 });
              }}
              className="shrink-0 rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300"
            >
              Copy
            </button>
            <button
              onClick={() => setCreatedSecret(null)}
              className="shrink-0 text-xs text-amber-700 hover:underline dark:text-amber-400"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : tokens === null ? (
          <p className="text-sm text-zinc-400">Loading tokens…</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-zinc-400">No tokens yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="font-medium text-zinc-800 dark:text-zinc-100">{t.label}</span>
                <span className="text-xs text-zinc-400">
                  created {new Date(t.createdAt).toLocaleDateString()}
                  {t.lastUsedAt
                    ? ` · last used ${new Date(t.lastUsedAt).toLocaleDateString()}`
                    : " · never used"}
                </span>
                <button
                  onClick={() => setConfirmId(t.id)}
                  className="ml-auto text-xs font-medium text-zinc-400 hover:text-red-600"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmId && (
        <ConfirmDialog
          title="Revoke this token?"
          description="Scripts using it will stop working. You'll have a few seconds to undo."
          confirmText="Revoke"
          onConfirm={revoke}
          onCancel={() => setConfirmId(null)}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          durationMs={toast.durationMs}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
}
