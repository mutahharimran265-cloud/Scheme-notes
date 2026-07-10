import { NextRequest, NextResponse } from "next/server";
import { signToken, MAGIC_TTL, isValidEmail, normalizeEmail } from "@/lib/auth";
import { isEmailConfigured, sendMagicLink } from "@/lib/mailer";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/auth/request  { email } -> emails (or, in dev, logs) a magic link.
export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => null);
  const email = normalizeEmail(typeof data?.email === "string" ? data.email : "");
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Rate-limit to prevent magic-link email bombing — per sender IP and per
  // target email (so a victim's inbox can't be flooded from many IPs).
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (
    isRateLimited(`auth-ip:${ip}`, 8, 10 * 60 * 1000).limited ||
    isRateLimited(`auth-email:${email}`, 4, 10 * 60 * 1000).limited
  ) {
    return NextResponse.json(
      { error: "Too many sign-in requests. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const token = signToken({ email, purpose: "magic" }, MAGIC_TTL);
  // Use the origin the request actually arrived on so the link is always
  // reachable. Set APP_ORIGIN to force a canonical URL (e.g. behind a proxy).
  const origin = process.env.APP_ORIGIN?.trim() || req.nextUrl.origin;
  const link = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}`;

  // Send by email when SMTP is configured; otherwise fall back to logging the
  // link (and, in dev, returning it) so the app works with zero email setup.
  if (isEmailConfigured()) {
    try {
      await sendMagicLink(email, link);
    } catch (err) {
      console.error("Magic-link email failed:", err);
      return NextResponse.json(
        { error: "Couldn't send the sign-in email. Please try again shortly." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, sent: true });
  }

  // Return the link in the response for local dev, and for a shared preview
  // build with SCHEMNOTES_PREVIEW_LOGIN=1 (so testers can sign in without SMTP).
  // NOTE: preview mode lets anyone who requests a link for an address sign in as
  // it — only enable it for trusted preview builds, never real production.
  const isDev = process.env.NODE_ENV !== "production";
  const preview = process.env.SCHEMNOTES_PREVIEW_LOGIN === "1";
  if (isDev || preview) {
    // Only log the link when we're intentionally exposing it (dev/preview).
    // A signed magic link is a bearer credential — never write it to prod logs.
    console.log(`\n🔗 SchemNotes sign-in link for ${email}:\n${link}\n`);
    return NextResponse.json({ ok: true, devLink: link });
  }
  // Production with no SMTP and no preview mode: we can neither email the link
  // nor hand it back, so sign-in would silently dead-end. Fail loudly instead
  // so the misconfiguration is obvious rather than looking like a broken login.
  return NextResponse.json(
    { error: "Email sign-in isn't configured on this server yet. Set SMTP_* to enable it." },
    { status: 503 },
  );
}
