import TeamManager from "@/components/TeamManager";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="flex-1">
      <TeamManager id={id} />
    </main>
  );
}
