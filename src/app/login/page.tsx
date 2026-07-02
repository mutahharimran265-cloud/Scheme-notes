import Link from "next/link";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sign in to SchemNotes
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          To see and manage the schematics you&apos;ve shared.
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <LoginForm initialError={Boolean(error)} />
      </div>
      <p className="text-center text-sm text-zinc-500">
        Just here to review?{" "}
        <Link href="/" className="font-medium text-indigo-600 hover:underline">
          You don&apos;t need an account to comment.
        </Link>
      </p>
    </main>
  );
}
