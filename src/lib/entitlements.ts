// Entitlements — the single source of truth for plan-gated features.
//
// Built ahead of billing (per the roadmap) so every cloud/team feature is
// gated from day one instead of retrofitted. Rules:
//   - Core annotation features (upload, view, pin comments, threads, status,
//     search, export, backups) are NEVER listed here. They are free and
//     fully offline, permanently. Only additive cloud/team features appear.
//   - Server code must check hasFeature() before serving a gated capability;
//     client code may also check it, but only for UI (never as the guard).

export type Plan = "free" | "pro" | "team";

export type Feature =
  | "cloud_sync"
  | "cloud_backup"
  | "shared_workspaces"
  | "roles_permissions"
  | "notifications"
  | "integrations";

const PRO_FEATURES: readonly Feature[] = ["cloud_sync", "cloud_backup"];
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
