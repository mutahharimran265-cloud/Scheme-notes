# SchemNotes — production container for cloud / self-hosted deployments.
#
# Postgres-backed by default so projects sync across devices (see DEPLOY.md).
# Local development does NOT use this image — run `npm run dev` on SQLite.
FROM node:22-bookworm-slim

# Prisma's query engine needs OpenSSL; ca-certificates for outbound TLS.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# The cloud image talks to Postgres. The Prisma client is generated for this
# provider at build time, so don't change it at runtime.
ENV DB_PROVIDER=postgresql

# Copy the source first so the postinstall hook (prisma generate + pdf worker
# copy) has the schema and scripts it needs, then point the datasource at
# Postgres and install + build.
COPY . .
RUN node scripts/use-db-provider.mjs postgresql \
  && npm ci \
  && npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Uploaded schematics are written here — mount a persistent volume so they
# survive container restarts and redeploys.
VOLUME ["/app/public/uploads"]

RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
