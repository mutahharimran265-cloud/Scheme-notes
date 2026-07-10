import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { parsePageParam } from "@/lib/pagination";

export const runtime = "nodejs";

// GET /api/projects -> list projects for the logged-in user
export async function GET(req: NextRequest) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const page = parsePageParam(req.nextUrl.searchParams.get("page"), 1, 1, Number.MAX_SAFE_INTEGER);
  const limit = parsePageParam(req.nextUrl.searchParams.get("limit"), 20, 1, 100);
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
