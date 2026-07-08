import { prisma } from "./prisma";
import { hashToken } from "./auth";

export function bearerFromRequest(req: Request): string | null {
  return req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;
}

/**
 * Resolve the account for a Bearer API token (and bump lastUsedAt). `email` is
 * null for legacy tokens created before per-account ownership; cloud sync
 * requires an owned token.
 */
export async function ownerForBearer(
  bearer: string | null,
): Promise<{ id: string; email: string | null } | null> {
  if (!bearer) return null;
  const token = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(bearer) } });
  if (!token) return null;
  await prisma.apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });
  return { id: token.id, email: token.email };
}
