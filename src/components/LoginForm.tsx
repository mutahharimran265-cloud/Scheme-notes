"use client";

import { useState } from "react";

export default function LoginForm({ initialError }: { initialError?: boolean }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    initialError ? "That sign-in link was invalid or expired. Try again." : null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not send link.");
        return;
      }
      setSent(true);
      setDevLink(data.devLink ?? null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-indigo-100 text-2xl dark:bg-indigo-950">
          ✉️
        </div>
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="mt-1 text-sm text-zinc-500">
          We sent a sign-in link to <span className="font-medium">{email}</span>.
        </p>
        {devLink && (
          <div className="mt-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-left text-xs dark:border-amber-800 dark:bg-amber-950/40">
            <p className="mb-1 font-medium text-amber-700 dark:text-amber-400">
              Dev mode — no email is actually sent:
            </p>
            <a href={devLink} className="break-all font-mono text-indigo-600 underline">
              {devLink}
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? "Sending…" : "Email me a sign-in link"}
      </button>
      <p className="text-center text-xs text-zinc-400">
        Passwordless — we&apos;ll email you a one-time link.
      </p>
    </form>
  );
}
