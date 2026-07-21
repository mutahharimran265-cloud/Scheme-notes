import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import { SITE, CURRENT_YEAR } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} handles your data.`,
};

export default function PrivacyPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-foreground/45">Last updated: {CURRENT_YEAR}</p>
        <div className="mt-6 space-y-4 leading-relaxed text-foreground/70">
          <p>
            This policy explains what data {SITE.name} collects and how it is used. We keep it to
            the minimum needed to run the service.
          </p>

          <h2 className="pt-3 font-display text-lg font-semibold text-foreground">What we collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Your email address</strong> — only if you choose to
              sign in. It&apos;s used to send your passwordless sign-in link and to associate your
              projects with your account.
            </li>
            <li>
              <strong className="text-foreground">Schematics and comments you upload</strong> — the
              files and comment text you create, so the review can be shown and shared.
            </li>
            <li>
              <strong className="text-foreground">A per-browser token</strong> — a random value
              stored in your browser so you can edit or delete your own comments without an account.
            </li>
            <li>
              <strong className="text-foreground">A session cookie</strong> — set only after you sign
              in, to keep you signed in. It is strictly necessary and not used for tracking.
            </li>
          </ul>

          <h2 className="pt-3 font-display text-lg font-semibold text-foreground">
            What we do not do
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>We do not sell your data or share it with advertisers.</li>
            <li>We do not use tracking or analytics cookies.</li>
            <li>Images you paste into comments are stored with your project and never sent to third parties.</li>
          </ul>

          <h2 className="pt-3 font-display text-lg font-semibold text-foreground">Your control</h2>
          <p>
            You can delete any project — including its schematic and all comments — at any time from
            your dashboard, which removes that data. You can export a project&apos;s review as a PDF
            whenever you like.
          </p>

          <h2 className="pt-3 font-display text-lg font-semibold text-foreground">Contact</h2>
          <p>
            For any privacy question, reach out via the{" "}
            <a
              href={`${SITE.github}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline dark:text-indigo-400"
            >
              project&apos;s GitHub
            </a>
            .
          </p>
          <p className="pt-4 text-sm">
            <Link href="/" className="text-indigo-600 hover:underline dark:text-indigo-400">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
