"use client";

import { useEffect, useState } from "react";

type Config = {
  cloudUrl: string;
  tokenSet: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
};

/**
 * Cloud sync config + push/pull. Shown to Pro accounts. The user pastes a
 * cloud instance URL and a Pro API token minted on that instance; "Push"
 * uploads this workspace, "Pull" replaces it with the cloud copy.
 */
export default function CloudSync() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [cloudUrl, setCloudUrl] = useState("");
  const [cloudToken, setCloudToken] = useState("");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState<"save" | "push" | "pull" | null>(null);

  async function load() {
    const res = await fetch("/api/cloud/config");
    if (res.ok) {
      const d = (await res.json()) as Config;
      setCfg(d);
      setCloudUrl(d.cloudUrl);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    setBusy("save");
    setMsg(null);
    try {
      const res = await fetch("/api/cloud/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cloudUrl, cloudToken }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't save.");
      setCloudToken("");
      setMsg({ text: "Cloud target saved." });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Couldn't save.", error: true });
    } finally {
      setBusy(null);
    }
  }

  async function sync(direction: "push" | "pull") {
    setBusy(direction);
    setMsg(null);
    try {
      const res = await fetch("/api/cloud/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Sync failed.");
      setMsg({
        text: `${direction === "push" ? "Pushed to" : "Pulled from"} cloud — ${d.projects} project(s), ${d.comments} comment(s).`,
      });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Sync failed.", error: true });
    } finally {
      setBusy(null);
    }
  }

  const configured = Boolean(cfg?.cloudUrl && cfg?.tokenSet);
  const field =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <section className="mt-12">
      <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Cloud sync
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">
        Push this workspace to a cloud SchemNotes instance and pull it on another device. Sign in on
        your cloud instance, create a Pro API token there, and paste it below. Sync replaces the
        whole workspace (last write wins).
      </p>

      <div className="mt-4 grid max-w-2xl gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          value={cloudUrl}
          onChange={(e) => setCloudUrl(e.target.value)}
          placeholder="https://cloud.example.com"
          className={field}
        />
        <input
          type="password"
          value={cloudToken}
          onChange={(e) => setCloudToken(e.target.value)}
          placeholder={cfg?.tokenSet ? "Token saved — paste to replace" : "Cloud API token (sn_…)"}
          className={field}
        />
        <button
          onClick={save}
          disabled={busy !== null}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {busy === "save" ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => sync("push")}
          disabled={!configured || busy !== null}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy === "push" ? "Pushing…" : "↑ Push to cloud"}
        </button>
        <button
          onClick={() => sync("pull")}
          disabled={!configured || busy !== null}
          className="rounded-lg border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
        >
          {busy === "pull" ? "Pulling…" : "↓ Pull from cloud"}
        </button>
        {cfg?.lastSyncAt && (
          <span className="text-xs text-zinc-400">
            Last synced {new Date(cfg.lastSyncAt).toLocaleString()}
          </span>
        )}
      </div>

      {msg && (
        <p className={`mt-2 text-sm ${msg.error ? "text-red-600" : "text-emerald-600"}`}>{msg.text}</p>
      )}
      {!msg && cfg?.lastError && (
        <p className="mt-2 text-sm text-red-600">Last sync error: {cfg.lastError}</p>
      )}
    </section>
  );
}
