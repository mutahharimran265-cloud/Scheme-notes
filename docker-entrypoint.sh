#!/bin/sh
set -e

# Apply the Prisma schema to the database. `db push` (not `migrate deploy`) is
# used on the cloud/Postgres path because the committed migration history is
# SQLite-specific. It's safe to run on every start — a no-op when the schema
# already matches.
echo "SchemNotes: syncing database schema (prisma db push)…"
npx prisma db push --skip-generate

echo "SchemNotes: starting server…"
exec "$@"
