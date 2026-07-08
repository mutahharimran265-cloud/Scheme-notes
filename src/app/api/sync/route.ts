import { NextRequest, NextResponse } from "next/server";
import { ownerForBearer, bearerFromRequest } from "@/lib/token-auth";
import { hasFeatureForEmail } from "@/lib/plan";
import { buildOwnerBundle, applyOwnerBundle, type SyncBundle } from "@/lib/bundle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The "cloud" side of sync. A per-account API token (minted while signed in on
// this instance) authenticates the caller as its owner:
//   GET  /api/sync -> the owner's full workspace bundle (pull)
//   PUT  /api/sync -> replace the owner's workspace with the posted bundle (push)
async function authOwner(req: NextRequest): Promise<{ email: string } | NextResponse> {
  const owner = await ownerForBearer(bearerFromRequest(req));
  if (!owner || !owner.email) {
    return NextResponse.json(
      { error: "A per-account API token is required (Authorization: Bearer sn_…)." },
      { status: 401 },
    );
  }
  if (!(await hasFeatureForEmail("cloud_sync", owner.email))) {
    return NextResponse.json({ error: "Cloud sync is a Pro feature." }, { status: 402 });
  }
  return { email: owner.email };
}

export async function GET(req: NextRequest) {
  const a = await authOwner(req);
  if (a instanceof NextResponse) return a;
  return NextResponse.json(await buildOwnerBundle(a.email));
}

export async function PUT(req: NextRequest) {
  const a = await authOwner(req);
  if (a instanceof NextResponse) return a;
  const bundle = (await req.json().catch(() => null)) as SyncBundle | null;
  if (!bundle || bundle.app !== "SchemNotes" || !Array.isArray(bundle.projects)) {
    return NextResponse.json({ error: "Invalid sync bundle." }, { status: 400 });
  }
  const result = await applyOwnerBundle(a.email, bundle);
  return NextResponse.json({ ok: true, ...result });
}
