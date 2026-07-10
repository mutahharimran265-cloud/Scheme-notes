"use client";

import { useState } from "react";
import Link from "next/link";

/** Accept-a-team-invite widget. The user must be signed in with the invited email. */
export default function AcceptInvite({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");
  const [teamId, setTeamId] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/teams/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setNeedLogin(true);
        return;
      }
      if (!res.ok) {
        setState("err");
        setMsg(d.error || "Couldn't accept the invite.");
        return;
      }
      setState("ok");
      setTeamId(d.teamId);
    } catch {
      setState("err");
      setMsg("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) return <p className="text-sm text-red-600">This invite link is missing its token.</p>;

  if (state === "ok") {
    return (
      <div className="text-center">
        <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-50">You&apos;re in! 🎉</h1>
        <p className="mt-1 text-sm text-zinc-500">You&apos;ve joined the team workspace.</p>
        <Link
          href={`/teams/${teamId}`}
          className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Go to the team →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-50">Join the team</h1>
      <p className="mt-1 text-sm text-zinc-500">Accept your invitation to this SchemNotes workspace.</p>
      {needLogin ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
          Please{" "}
          <Link href="/login" className="text-indigo-600 hover:underline">
            sign in
          </Link>{" "}
          with the invited email address, then reopen this link.
        </p>
      ) : (
        <button
          onClick={accept}
          disabled={busy}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Accepting…" : "Accept invite"}
        </button>
      )}
      {state === "err" && <p className="mt-2 text-sm text-red-600">{msg}</p>}
    </div>
  );
}
