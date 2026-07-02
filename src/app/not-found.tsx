import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid flex-1 place-items-center px-6 py-20 text-center">
      <div>
        <p className="text-5xl font-bold text-zinc-900 dark:text-zinc-100">404</p>
        <p className="mt-2 text-zinc-500">
          This page or project doesn&apos;t exist (or was removed).
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
