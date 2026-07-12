import AcceptInvite from "@/components/AcceptInvite";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-20">
      <AcceptInvite token={token ?? ""} />
    </main>
  );
}
