"use client";

import { useEffect, useState } from "react";

type Member = { email: string; level: string };
type TeamRow = { id: string; name: string };

/** Owner/admin control to set a project's visibility, attach it to a team, and
 * grant per-person access levels. Public projects keep the link-share model. */
export default function ProjectShareControl({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState("public");
  const [teamId, setTeamId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("commenter");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [sRes, tRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/share`),
      fetch("/api/teams").catch(() => null),
    ]);
    if (sRes.ok) {
      const d = await sRes.json();
      setVisibility(d.visibility);
      setTeamId(d.teamId ?? "");
      setMembers(d.members ?? []);
    }
    if (tRes && tRes.ok) {
      const d = await tRes.json();
      setTeams((d.teams ?? []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
    }
  }
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function save(extra?: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/projects/${projectId}/share`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility, teamId: teamId || null, ...extra }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(d.error || "Couldn't save sharing settings.");
    else {
      setMsg("Saved.");
      await load();
    }
    setBusy(false);
  }

  const field =
    "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Share
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-3 text-sm shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Visibility
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={field}>
              <option value="public">Public — anyone with the link</option>
              <option value="private">Private — members only</option>
            </select>
          </label>
          <label className="mt-2 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Team
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={field}>
              <option value="">— none —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">People with access</p>
            <ul className="mt-1 space-y-1">
              {members.length === 0 && <li className="text-xs text-zinc-400">Just the owner so far.</li>}
              {members.map((m) => (
                <li key={m.email} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate">{m.email}</span>
                  <span className="text-zinc-400">{m.level}</span>
                  <button
                    onClick={() => save({ members: [{ email: m.email, remove: true }] })}
                    className="text-zinc-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-1.5 flex gap-1">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="viewer">viewer</option>
                <option value="commenter">commenter</option>
                <option value="admin">admin</option>
              </select>
              <button
                onClick={async () => {
                  if (!email.trim()) return;
                  await save({ members: [{ email: email.trim(), level }] });
                  setEmail("");
                }}
                className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Add
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => save()}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            {msg && (
              <span className={`text-xs ${msg === "Saved." ? "text-emerald-600" : "text-red-600"}`}>{msg}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
