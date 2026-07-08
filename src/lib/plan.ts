// Per-user plan resolution. `entitlements.ts` stays the sync, deployment-wide
// source of truth (SCHEMNOTES_PLAN); this layer adds the per-account plan set
// by billing, keyed by the signed-in email.

import { prisma } from "./prisma";
import { getPlan, hasFeature, planLimits, type Plan, type Feature } from "./entitlements";

const RANK: Record<Plan, number> = { free: 0, pro: 1, team: 2 };

export function coercePlan(value: string | null | undefined): Plan {
  return value === "pro" || value === "team" ? value : "free";
}

/**
 * The effective plan for a signed-in email: the higher of the per-account plan
 * (set by the Stripe webhook) and the deployment-wide SCHEMNOTES_PLAN. The env
 * override keeps single-tenant self-hosting simple — set it to "pro" to unlock
 * everything — while multi-tenant SaaS leaves the env at "free" and lets each
 * account's subscription drive access.
 */
export async function getPlanForEmail(email: string | null): Promise<Plan> {
  const envPlan = getPlan();
  if (!email) return envPlan;
  let userPlan: Plan = "free";
  try {
    const acct = await prisma.account.findUnique({ where: { email } });
    userPlan = coercePlan(acct?.plan);
  } catch {
    userPlan = "free";
  }
  return RANK[userPlan] >= RANK[envPlan] ? userPlan : envPlan;
}

export async function hasFeatureForEmail(
  feature: Feature,
  email: string | null,
): Promise<boolean> {
  return hasFeature(feature, await getPlanForEmail(email));
}

/** Start of the current calendar month (UTC) — the upload-quota window. */
export function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export type UploadAllowance = {
  used: number;
  limit: number | null; // null = unlimited
  allowed: boolean;
};

/**
 * Monthly upload quota for a signed-in account. Free is capped by volume; paid
 * plans are unlimited. The cap is per-account (by email) — anonymous "try it"
 * uploads (no session) are not counted, since a global null-owner counter would
 * be shared across everyone on a hosted deploy. Counts projects created this
 * calendar month.
 */
export async function uploadAllowance(email: string | null): Promise<UploadAllowance> {
  const plan = await getPlanForEmail(email);
  const { maxUploadsPerMonth: limit } = planLimits(plan);
  if (limit === null || !email) return { used: 0, limit: null, allowed: true };
  const used = await prisma.project.count({
    where: { ownerEmail: email, createdAt: { gte: monthStart() } },
  });
  return { used, limit, allowed: used < limit };
}
