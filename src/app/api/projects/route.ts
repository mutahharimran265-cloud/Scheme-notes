import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/projects -> list projects for the logged-in user
export async function GET(req: NextRequest) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  const projects = await prisma.project.findMany({
    where: { ownerEmail: email },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    include: { files: { take: 1, orderBy: { uploadedAt: "asc" } } },
  });

  return NextResponse.json({ projects, page, limit });
}
