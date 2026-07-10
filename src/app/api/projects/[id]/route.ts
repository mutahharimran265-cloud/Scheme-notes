import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { sanitizeHtml } from "@/lib/sanitize";

export const runtime = "nodejs";

// GET /api/projects/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Public/link endpoint — select only non-sensitive fields (never leak
  // ownerEmail to anyone with the share link).
  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      visibility: true,
      createdAt: true,
      updatedAt: true,
      files: { orderBy: { uploadedAt: "asc" } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}

// PATCH /api/projects/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const email = await getSessionEmail();
  
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.ownerEmail !== email) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const data = await req.json().catch(() => null);
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof data.title === "string") {
    const title = sanitizeHtml(data.title.trim()).slice(0, 100);
    if (!title) {
      return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
    }
    const updated = await prisma.project.update({
      where: { id },
      data: { title },
    });
    return NextResponse.json({ project: updated });
  }

  return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
}

// DELETE /api/projects/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const email = await getSessionEmail();
  
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.ownerEmail !== email) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Deleting a project cascades to files and comments per schema
  await prisma.project.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
