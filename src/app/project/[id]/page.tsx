import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toThreadDTO } from "@/lib/comments";
import ProjectWorkspace from "@/components/ProjectWorkspace";
import CopyLinkButton from "@/components/CopyLinkButton";
import RevisionBar from "@/components/RevisionBar";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rev?: string; focus?: string }>;
}) {
  const { id } = await params;
  const { rev, focus } = await searchParams;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      revisions: {
        orderBy: { createdAt: "desc" },
        include: { files: { orderBy: { uploadedAt: "asc" }, take: 1 } },
      },
    },
  });
  if (!project) notFound();

  const revisions = project.revisions;
  const activeRev = revisions.find((r) => r.id === rev) ?? revisions[0] ?? null;
  const file = activeRev?.files[0] ?? null;

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

  const revisionSummaries = revisions.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.createdAt.toISOString(),
    fileId: r.files[0]?.id ?? null,
  }));

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-black/[0.06] bg-background/80 px-4 py-2.5 backdrop-blur-md sm:px-6 dark:border-white/[0.08]">
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
        <div className="flex flex-wrap items-center gap-2">
          {activeRev && (
            <RevisionBar
              projectId={project.id}
              revisions={revisionSummaries}
              activeId={activeRev.id}
            />
          )}
          <CopyLinkButton />
        </div>
      </div>

      <div className="min-h-0 flex-1 bp-grid">
        {file && activeRev ? (
          <ProjectWorkspace
            projectId={project.id}
            fileId={file.id}
            fileUrl={file.fileUrl}
            fileType={file.fileType}
            initialThreads={initialThreads}
            revisions={revisionSummaries}
            activeRevisionId={activeRev.id}
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
