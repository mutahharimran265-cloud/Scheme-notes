import crypto from "node:crypto";
import { cookies } from "next/headers";

// Lightweight, dependency-free signed tokens (HMAC-SHA256). Good enough for a
// passwordless magic-link flow; swap for a library like `jose` if you need JWKS.

const DEV_SECRET = "dev-only-insecure-change-me";

// Resolved lazily (not at module load) so a missing secret fails on the first
// signed request in production rather than breaking `next build`. Local dev
// falls back to a known insecure value; a hosted deploy must set a real one.
let cachedSecret: string | null = null;
function getSecret(): string {
  if (cachedSecret) return cachedSecret;
  const raw = process.env.AUTH_SECRET;
  const insecure = !raw || raw.length < 16 || raw === "change-me" || raw === DEV_SECRET;
  if (process.env.NODE_ENV === "production" && insecure) {
    throw new Error(
      "AUTH_SECRET must be set to a strong random value in production. Generate one with: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }
  cachedSecret = raw || DEV_SECRET;
  return cachedSecret;
}

export const SESSION_COOKIE = "schemnotes_session";
export const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days
export const MAGIC_TTL = 60 * 15; // 15 minutes

type Purpose = "magic" | "session";
type TokenPayload = { email: string; purpose: Purpose; exp: number };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function signToken(
  payload: { email: string; purpose: Purpose },
  ttlSeconds: number,
): string {
  const body: TokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyToken(token: string | undefined | null): TokenPayload | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  const expected = crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as TokenPayload;
    if (!payload.email || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Reads the signed session cookie (server components / route handlers). */
export async function getSessionEmail(): Promise<string | null> {
  const store = await cookies();
  const payload = verifyToken(store.get(SESSION_COOKIE)?.value);
  return payload?.purpose === "session" ? payload.email : null;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
