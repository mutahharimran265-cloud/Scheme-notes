import TeamManager from "@/components/TeamManager";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="flex-1">
      <TeamManager id={id} />
    </main>
  );
}
