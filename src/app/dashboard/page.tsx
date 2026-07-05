import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectList } from "@/components/ProjectList";
import ExportButton from "@/components/ExportButton";
import ApiTokens from "@/components/ApiTokens";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const email = await getSessionEmail();
  if (!email) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { ownerEmail: email },
    orderBy: { createdAt: "desc" },
    include: { files: { take: 1, orderBy: { uploadedAt: "asc" } } },
  });

  const cards = await Promise.all(
    projects.map(async (p) => {
      const file = p.files[0] ?? null;
      const [total, open] = file
        ? await Promise.all([
            prisma.comment.count({
              where: { schematicFileId: file.id, parentCommentId: null },
            }),
            prisma.comment.count({
              where: {
                schematicFileId: file.id,
                parentCommentId: null,
                resolved: false,
              },
            }),
          ])
        : [0, 0];
      return { project: p, file, total, open };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            My projects
          </h1>
          <p className="text-sm text-zinc-500">Signed in as {email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + New project
          </Link>
          <ExportButton />
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <ProjectList initialCards={cards} />

      <ApiTokens />
    </main>
  );
}
