// Database backend detection. Used by the health probe and the Prisma
// datasource-provider swap at build time (see scripts/use-db-provider.mjs).
// A "cloud" deployment points DATABASE_URL at a shared/managed Postgres and
// runs with DB_PROVIDER=postgresql; because projects are owner-scoped by email
// (magic-link auth), a shared database means signing in on any device shows the
// same projects — no separate sync engine needed.

export type DbProvider = "sqlite" | "postgresql";

/** The database backend this instance is built/running against. */
export function dbProvider(): DbProvider {
  return process.env.DB_PROVIDER === "postgresql" ? "postgresql" : "sqlite";
}
