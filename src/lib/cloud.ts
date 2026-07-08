// Cloud mode — the single place that answers "is this a cloud deployment, and
// is cross-device sync active right now?".
//
// SchemNotes is local-first: the free experience runs on SQLite on one machine.
// A *cloud* deployment points DATABASE_URL at a shared/managed Postgres and
// runs with DB_PROVIDER=postgresql. Because projects are already owner-scoped
// by email (magic-link auth), a shared database means signing in on any device
// shows you the same projects — that is the "cloud sync across devices" feature.
// Whether it is *surfaced* to the user is gated by the Pro entitlement so the
// tiering stays consistent with billing.

import { hasFeature, getPlan, type Plan } from "./entitlements";

export type DbProvider = "sqlite" | "postgresql";

/** The database backend this instance is built/running against. */
export function dbProvider(): DbProvider {
  return process.env.DB_PROVIDER === "postgresql" ? "postgresql" : "sqlite";
}

/**
 * True when the instance is backed by a shared/managed database — the
 * infrastructure precondition for cross-device sync (a single SQLite file on
 * one machine can't sync between devices).
 */
export function isCloudDatabase(): boolean {
  return dbProvider() === "postgresql";
}

/** The plan allows cloud sync (Pro or Team). UI-only signal, never a guard. */
export function cloudSyncEnabled(plan: Plan = getPlan()): boolean {
  return hasFeature("cloud_sync", plan);
}

/**
 * Sync is genuinely happening: the plan allows it AND the instance is on a
 * shared database. This is what the dashboard badge reflects.
 */
export function cloudSyncActive(plan: Plan = getPlan()): boolean {
  return cloudSyncEnabled(plan) && isCloudDatabase();
}

export type CloudStatus = {
  plan: Plan;
  provider: DbProvider;
  /** The plan permits cloud sync. */
  syncEnabled: boolean;
  /** Sync is active on this instance right now (plan + shared DB). */
  syncActive: boolean;
};

export function cloudStatus(): CloudStatus {
  const plan = getPlan();
  return {
    plan,
    provider: dbProvider(),
    syncEnabled: cloudSyncEnabled(plan),
    syncActive: cloudSyncActive(plan),
  };
}
