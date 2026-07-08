import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/entitlements";
import { cloudStatus } from "@/lib/cloud";
import { ProjectList } from "@/components/ProjectList";
import ExportButton from "@/components/ExportButton";
import ApiTokens from "@/components/ApiTokens";

export const dynamic = "force-dynamic";

function CloudSyncCard() {
  const cloud = cloudStatus();

  if (cloud.syncActive) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current stroke-[3]" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
        </span>
        <div className="text-sm">
          <p className="font-semibold text-emerald-800 dark:text-emerald-300">Cloud sync is on</p>
          <p className="text-emerald-700/80 dark:text-emerald-300/70">
            Your projects follow you — sign in with this email on any device to pick up where you left off.
          </p>
        </div>
      </div>
    );
  }

  if (cloud.syncEnabled) {
    // Pro plan, but this instance is on a single-machine database.
    return (
      <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm dark:border-indigo-900/60 dark:bg-indigo-950/30">
        <p className="font-semibold text-indigo-800 dark:text-indigo-300">Cloud sync ready</p>
        <p className="text-indigo-700/80 dark:text-indigo-300/70">
          Your plan includes cloud sync. Deploy SchemNotes with a cloud database (Postgres) to make
          your projects available across devices — see <code className="rounded bg-white px-1 py-0.5 text-xs dark:bg-zinc-900">DEPLOY.md</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div>
        <p className="font-semibold text-zinc-700 dark:text-zinc-200">Cloud sync <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">Pro</span></p>
        <p className="text-zinc-500">Work across machines — your projects on every device you sign in on.</p>
      </div>
      <Link href="/#pricing" className="rounded-lg border border-indigo-300 px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40">
        See plans →
      </Link>
    </div>
  );
}

export default async function DashboardPage() {
  const email = await getSessionEmail();
  if (!email) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { ownerEmail: email },
    orderBy: { createdAt: "desc" },
    include: { files: { take: 1, orderBy: { uploadedAt: "asc" } } },
  });

  const cards = await Promise.all(
    projects.map(async (p) => {
      const file = p.files[0] ?? null;
      const [total, open] = file
        ? await Promise.all([
            prisma.comment.count({
              where: { schematicFileId: file.id, parentCommentId: null },
            }),
            prisma.comment.count({
              where: {
                schematicFileId: file.id,
                parentCommentId: null,
                resolved: false,
              },
            }),
          ])
        : [0, 0];
      return { project: p, file, total, open };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            My projects
          </h1>
          <p className="text-sm text-zinc-500">Signed in as {email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + New project
          </Link>
          <ExportButton />
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <CloudSyncCard />

      <ProjectList initialCards={cards} />

      <ApiTokens enabled={hasFeature("api_tokens")} />
    </main>
  );
}
