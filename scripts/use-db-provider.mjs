#!/usr/bin/env node
// Switch the Prisma datasource provider between SQLite (local dev — the
// committed default) and PostgreSQL (cloud deploys). Prisma's `provider` is a
// static value, so a cloud build rewrites it here before `prisma generate` /
// `prisma db push`. Idempotent; leaves the file untouched if already correct.
//
//   node scripts/use-db-provider.mjs postgresql   # or: DB_PROVIDER=postgresql node scripts/use-db-provider.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const arg = process.argv[2];
const provider =
  arg === "postgresql" || arg === "sqlite"
    ? arg
    : process.env.DB_PROVIDER === "postgresql"
      ? "postgresql"
      : "sqlite";

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
const schema = await readFile(schemaPath, "utf8");

// Match the provider line inside the `datasource db { … }` block only.
const next = schema.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"(?:sqlite|postgresql)"/s,
  `$1"${provider}"`,
);

if (next === schema) {
  console.log(`schema.prisma datasource provider already "${provider}".`);
} else {
  await writeFile(schemaPath, next);
  console.log(`schema.prisma datasource provider set to "${provider}".`);
}
