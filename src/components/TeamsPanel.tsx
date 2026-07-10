"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TeamRow = { id: string; name: string; role: string; members: number; projects: number };

/** Dashboard section: list the user's teams + create a new one. Team plan only. */
export default function TeamsPanel() {
  const [teams, setTeams] = useState<TeamRow[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error();
      setTeams((await res.json()).teams);
    } catch {
      setErr("Couldn't load your teams.");
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't create the team.");
      setName("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't create the team.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <section className="mt-12">
      <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Team workspaces
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">
        Shared workspaces with roles and per-project access (viewer / commenter / admin). Invite
        teammates by email; they annotate the same schematics.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="New team name"
          onKeyDown={(e) => e.key === "Enter" && create()}
          className={`${field} w-64`}
        />
        <button
          onClick={create}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create team"}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

      <div className="mt-4">
        {teams === null ? (
          <p className="text-sm text-zinc-400">Loading teams…</p>
        ) : teams.length === 0 ? (
          <p className="text-sm text-zinc-400">No teams yet — create one above.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {teams.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/teams/${t.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <span className="font-medium text-zinc-800 dark:text-zinc-100">{t.name}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800">
                    {t.role}
                  </span>
                  <span className="ml-auto text-xs text-zinc-400">
                    {t.members} member{t.members === 1 ? "" : "s"} · {t.projects} project
                    {t.projects === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
