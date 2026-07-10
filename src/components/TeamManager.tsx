"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Member = { email: string; role: string; createdAt: string };
type Invite = { email: string; role: string; createdAt: string };
type Project = { id: string; title: string; visibility: string };
type Team = {
  id: string;
  name: string;
  myRole: "owner" | "admin" | "member";
  members: Member[];
  invites: Invite[];
  projects: Project[];
};

/** Team management: members, roles, invites (copyable link), projects. Minimal. */
export default function TeamManager({ id }: { id: string }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${id}`);
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't load the team.");
      setTeam(d.team);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the team.");
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const canManage = team?.myRole === "owner" || team?.myRole === "admin";

  async function invite() {
    if (!inviteEmail.trim()) return;
    setMsg(null);
    setInviteLink(null);
    const res = await fetch(`/api/teams/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(d.error || "Couldn't create the invite.");
      return;
    }
    setInviteEmail("");
    setInviteLink(d.inviteUrl);
    await load();
  }

  async function setRole(email: string, role: string) {
    const res = await fetch(`/api/teams/${id}/members/${encodeURIComponent(email)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) setMsg((await res.json().catch(() => ({}))).error || "Couldn't change role.");
    await load();
  }
  async function remove(email: string) {
    const res = await fetch(`/api/teams/${id}/members/${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
    if (!res.ok) setMsg((await res.json().catch(() => ({}))).error || "Couldn't remove member.");
    await load();
  }
  async function del() {
    if (!confirm("Delete this team? Projects are detached, not deleted.")) return;
    const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
    if (res.ok) window.location.href = "/dashboard";
    else setMsg((await res.json().catch(() => ({}))).error || "Couldn't delete the team.");
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/dashboard" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }
  if (!team) return <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-zinc-400">Loading…</div>;

  const roleBadge =
    "rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {team.name} <span className={roleBadge}>{team.myRole}</span>
      </h1>
      {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}

      {/* Members */}
      <h2 className="mt-8 text-sm font-semibold text-zinc-700 dark:text-zinc-200">Members</h2>
      <ul className="mt-2 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {team.members.map((m) => (
          <li key={m.email} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="text-zinc-800 dark:text-zinc-100">{m.email}</span>
            {canManage ? (
              <select
                value={m.role}
                onChange={(e) => setRole(m.email, e.target.value)}
                className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="owner">owner</option>
                <option value="admin">admin</option>
                <option value="member">member</option>
              </select>
            ) : (
              <span className={roleBadge}>{m.role}</span>
            )}
            {canManage && (
              <button
                onClick={() => remove(m.email)}
                className="ml-auto text-xs text-zinc-400 hover:text-red-600"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Invite */}
      {canManage && (
        <>
          <h2 className="mt-8 text-sm font-semibold text-zinc-700 dark:text-zinc-200">Invite a teammate</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button
              onClick={invite}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Create invite
            </button>
          </div>
          {inviteLink && (
            <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-800 dark:bg-amber-950/40">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Send this invite link (they sign in with the invited email to accept):
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all font-mono text-indigo-600">{inviteLink}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(inviteLink).catch(() => {})}
                  className="shrink-0 rounded border border-amber-300 px-2 py-1 font-medium text-amber-800 dark:border-amber-800 dark:text-amber-300"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
          {team.invites.length > 0 && (
            <ul className="mt-2 text-xs text-zinc-500">
              {team.invites.map((i) => (
                <li key={i.email}>
                  Pending: {i.email} ({i.role})
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Projects */}
      <h2 className="mt-8 text-sm font-semibold text-zinc-700 dark:text-zinc-200">Team projects</h2>
      {team.projects.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">
          No projects shared with this team yet. Open a project you own and use its Share control to
          attach it here.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {team.projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/project/${p.id}`}
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <span className="text-zinc-800 dark:text-zinc-100">{p.title}</span>
                <span className={`ml-auto ${roleBadge}`}>{p.visibility}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {team.myRole === "owner" && (
        <button onClick={del} className="mt-8 text-sm font-medium text-red-600 hover:underline">
          Delete team
        </button>
      )}
    </div>
  );
}
