// Entitlements — the single source of truth for plan-gated features.
//
// Built ahead of billing (per the roadmap) so every cloud/team feature is
// gated from day one instead of retrofitted. Rules:
//   - Core annotation features (upload, view, pin comments, threads, status,
//     search, markdown, export, backups) are NEVER listed here. They are free
//     and fully offline, permanently — moving those behind a paywall would
//     lock users out of their own data.
//   - Additive power / cloud / team capabilities live here and require a plan.
//     "api_tokens" (scriptable REST access) is a Pro power feature; the free
//     tier keeps the full interactive review experience on every file format
//     (including native KiCad).
//   - The free tier is limited by VOLUME, not capability — see planLimits()
//     (uploads per month). Server code must check hasFeature()/planLimits()
//     before serving a gated capability; client code may also check, but only
//     for UI (never as the guard).

export type Plan = "free" | "pro" | "team";

export type Feature =
  | "cloud_sync"
  | "cloud_backup"
  | "api_tokens"
  | "shared_workspaces"
  | "roles_permissions"
  | "notifications"
  | "integrations";

const PRO_FEATURES: readonly Feature[] = [
  "cloud_sync",
  "cloud_backup",
  "api_tokens",
];
const TEAM_FEATURES: readonly Feature[] = [
  ...PRO_FEATURES,
  "shared_workspaces",
  "roles_permissions",
  "notifications",
  "integrations",
];

const PLAN_FEATURES: Record<Plan, readonly Feature[]> = {
  free: [],
  pro: PRO_FEATURES,
  team: TEAM_FEATURES,
};

/**
 * The active plan. Local installs are "free" (fully functional, offline).
 * Later: resolved from a license key or the billing account; the env var
 * is a development override, not a bypass (server-side checks stay in place).
 */
export function getPlan(): Plan {
  const env = process.env.SCHEMNOTES_PLAN;
  if (env === "pro" || env === "team") return env;
  return "free";
}

export function hasFeature(feature: Feature, plan: Plan = getPlan()): boolean {
  return PLAN_FEATURES[plan].includes(feature);
}

// Volume limits (the free tier is capped by quantity, not capability).
// `maxUploadsPerMonth: null` means unlimited.
export type PlanLimits = { maxUploadsPerMonth: number | null };

export const FREE_UPLOADS_PER_MONTH = 5;

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { maxUploadsPerMonth: FREE_UPLOADS_PER_MONTH },
  pro: { maxUploadsPerMonth: null },
  team: { maxUploadsPerMonth: null },
};

export function planLimits(plan: Plan = getPlan()): PlanLimits {
  return PLAN_LIMITS[plan];
}
