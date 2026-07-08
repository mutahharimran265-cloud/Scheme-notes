import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toThreadDTO } from "@/lib/comments";
import ProjectWorkspace from "@/components/ProjectWorkspace";
import CopyLinkButton from "@/components/CopyLinkButton";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const { id } = await params;
  const { focus } = await searchParams;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  const file = await prisma.schematicFile.findFirst({
    where: { projectId: id },
    orderBy: { uploadedAt: "asc" },
  });

  const threads = file
    ? await prisma.comment.findMany({
        where: { schematicFileId: file.id, parentCommentId: null },
        orderBy: { createdAt: "asc" },
        include: { replies: { orderBy: { createdAt: "asc" } } },
      })
    : [];
  const initialThreads = threads.map((t) => toThreadDTO(t));

  const isKicad =
    file?.originalName?.toLowerCase().endsWith(".kicad_sch") ?? false;
  const formatLabel = file
    ? isKicad
      ? "KiCad"
      : file.fileType.toUpperCase()
    : "";
  const sourceHref = file ? (file.originalUrl ?? file.fileUrl) : "#";

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-black/[0.06] bg-background/80 px-4 py-2.5 backdrop-blur-md sm:px-6 dark:border-white/[0.08]">
        <div className="min-w-0">
          <h1 className="truncate font-display text-base font-bold tracking-tight sm:text-lg">
            {project.title}
          </h1>
          {file && (
            <p className="flex items-center gap-2 text-xs text-foreground/45">
              <span className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono font-medium">
                {formatLabel}
              </span>
              <Link
                href={sourceHref}
                target="_blank"
                download={file.originalName ?? undefined}
                className="transition-colors hover:text-foreground/70 hover:underline"
              >
                {file.originalUrl ? "Download source" : "Open original"}
              </Link>
            </p>
          )}
        </div>
        <CopyLinkButton />
      </div>

      <div className="min-h-0 flex-1 bp-grid">
        {file ? (
          <ProjectWorkspace
            fileId={file.id}
            fileUrl={file.fileUrl}
            fileType={file.fileType}
            title={project.title}
            initialThreads={initialThreads}
            focusCommentId={focus}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-foreground/50">
            This project has no schematic file.
          </div>
        )}
      </div>
    </main>
  );
}
