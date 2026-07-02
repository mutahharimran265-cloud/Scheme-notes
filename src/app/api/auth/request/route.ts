import { NextRequest, NextResponse } from "next/server";
import { signToken, MAGIC_TTL, isValidEmail, normalizeEmail } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/auth/request  { email } -> emails (or, in dev, logs) a magic link.
export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => null);
  const email = normalizeEmail(typeof data?.email === "string" ? data.email : "");
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const token = signToken({ email, purpose: "magic" }, MAGIC_TTL);
  // Use the origin the request actually arrived on so the link is always
  // reachable. Set APP_ORIGIN to force a canonical URL (e.g. behind a proxy).
  const origin = process.env.APP_ORIGIN?.trim() || req.nextUrl.origin;
  const link = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}`;

  // In production, send this link by email (Resend, Postmark, SMTP, …).
  // For local dev we log it and return it so you can click through immediately.
  console.log(`\n🔗 SchemNotes sign-in link for ${email}:\n${link}\n`);

  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ ok: true, ...(isDev ? { devLink: link } : {}) });
}
