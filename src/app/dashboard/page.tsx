import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeature, planLimits } from "@/lib/entitlements";
import { getPlanForEmail, uploadAllowance } from "@/lib/plan";
import { isBillingConfigured } from "@/lib/stripe";
import { ProjectList } from "@/components/ProjectList";
import AdSlot from "@/components/AdSlot";
import ExportButton from "@/components/ExportButton";
import UpgradeButton from "@/components/UpgradeButton";
import TeamsPanel from "@/components/TeamsPanel";

export const dynamic = "force-dynamic";

function UploadUsageCard({
  used,
  limit,
  billingConfigured,
}: {
  used: number;
  limit: number;
  billingConfigured: boolean;
}) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const atLimit = used >= limit;
  const left = Math.max(0, limit - used);
  return (
    <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center justify-between text-sm">
        <p className="font-semibold text-zinc-700 dark:text-zinc-200">Uploads this month</p>
        <p className={atLimit ? "font-semibold text-red-600" : "text-zinc-500"}>
          {used} / {limit}
        </p>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full ${atLimit ? "bg-red-500" : "bg-indigo-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          {atLimit
            ? "You've hit the free monthly limit — Pro is unlimited."
            : `${left} left on the free plan this month. Pro is unlimited.`}
        </p>
        {billingConfigured ? (
          <UpgradeButton
            plan="pro"
            label="Upgrade for unlimited"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          />
        ) : (
          <Link
            href="/#pricing"
            className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
          >
            See plans →
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; canceled?: string }>;
}) {
  const { upgraded, canceled } = await searchParams;
  const email = await getSessionEmail();
  if (!email) redirect("/login");

  const plan = await getPlanForEmail(email);
  const billingConfigured = isBillingConfigured();
  const usage = await uploadAllowance(email);
  const account = await prisma.account.findUnique({ where: { email } });
  const attachMb = Math.round(planLimits(plan).maxAttachmentBytes / (1024 * 1024));

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
          <p className="text-sm text-zinc-500">
            Signed in as {email}
            {plan !== "free" && (
              <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                {plan}
              </span>
            )}
            {account?.prioritySupport && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                Priority support
              </span>
            )}
            <span className="ml-2 text-xs text-zinc-400">· attachments up to {attachMb} MB</span>
          </p>
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

      {upgraded && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <span className="text-lg">🎉</span>
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
              Subscription active — thank you!
            </p>
            <p className="text-emerald-700/80 dark:text-emerald-300/70">
              Your plan is being applied. If features don&apos;t show immediately, refresh in a
              moment (the payment confirmation lands via webhook).
            </p>
          </div>
        </div>
      )}
      {canceled && (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
          Checkout canceled — no charge was made. You can upgrade any time.
        </div>
      )}

      {usage.limit !== null && (
        <UploadUsageCard
          used={usage.used}
          limit={usage.limit}
          billingConfigured={billingConfigured}
        />
      )}

      <ProjectList initialCards={cards} />

      {hasFeature("shared_workspaces", plan) && <TeamsPanel />}

      {/* Ad slot (revenue). Shown to free accounts only — paid plans are ad-free.
          It's a labelled placeholder; drop your ad-network code into AdSlot.tsx. */}
      {plan === "free" && <AdSlot className="mt-12" />}
    </main>
  );
}
