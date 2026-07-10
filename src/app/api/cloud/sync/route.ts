import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { hasFeatureForEmail } from "@/lib/plan";
import { buildOwnerBundle, applyOwnerBundle, type SyncBundle } from "@/lib/bundle";
import { assertSafePublicUrl } from "@/lib/ssrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function remoteError(res: Response): Promise<string> {
  const j = await res.json().catch(() => null);
  return j?.error || `Cloud responded ${res.status}.`;
}

async function mark(email: string, error: string | null) {
  await prisma.syncConfig.update({
    where: { email },
    data: { lastSyncAt: new Date(), lastError: error },
  });
}

// POST /api/cloud/sync { direction: "push" | "pull" } — sync this account's
// workspace with its configured cloud instance. push = local overwrites cloud;
// pull = cloud overwrites local (last write wins at the workspace level).
export async function POST(req: NextRequest) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Sign in to sync." }, { status: 401 });
  if (!(await hasFeatureForEmail("cloud_sync", email))) {
    return NextResponse.json({ error: "Cloud sync is a Pro feature." }, { status: 402 });
  }

  const cfg = await prisma.syncConfig.findUnique({ where: { email } });
  if (!cfg) {
    return NextResponse.json({ error: "Configure your cloud target first." }, { status: 400 });
  }

  // Re-validate the stored target at fetch time (SSRF guard — narrows the
  // window for DNS rebinding between save and use).
  try {
    await assertSafePublicUrl(cfg.cloudUrl);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cloud URL is not allowed." },
      { status: 400 },
    );
  }

  const data = await req.json().catch(() => null);
  const direction: "push" | "pull" = data?.direction === "pull" ? "pull" : "push";
  const endpoint = `${cfg.cloudUrl}/api/sync`;
  const auth = { Authorization: `Bearer ${cfg.cloudToken}` };

  try {
    let result: { projects: number; comments: number };
    if (direction === "push") {
      const bundle = await buildOwnerBundle(email);
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(bundle),
      });
      if (!res.ok) throw new Error(await remoteError(res));
      result = await res.json();
    } else {
      const res = await fetch(endpoint, { headers: auth });
      if (!res.ok) throw new Error(await remoteError(res));
      const bundle = (await res.json()) as SyncBundle;
      if (!bundle || bundle.app !== "SchemNotes" || !Array.isArray(bundle.projects)) {
        throw new Error("Cloud returned an invalid bundle.");
      }
      result = await applyOwnerBundle(email, bundle);
    }
    await mark(email, null);
    return NextResponse.json({ ok: true, direction, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed.";
    await mark(email, msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
