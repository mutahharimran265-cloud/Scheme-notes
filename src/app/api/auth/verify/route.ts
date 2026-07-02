import { NextRequest, NextResponse } from "next/server";
import { verifyToken, signToken, SESSION_COOKIE, SESSION_TTL } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/auth/verify?token=... -> exchanges a magic token for a session cookie.
export async function GET(req: NextRequest) {
  const payload = verifyToken(req.nextUrl.searchParams.get("token"));
  if (!payload || payload.purpose !== "magic") {
    return NextResponse.redirect(new URL("/login?error=invalid", req.url));
  }

  const session = signToken({ email: payload.email, purpose: "session" }, SESSION_TTL);
  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL,
  });
  return res;
}
