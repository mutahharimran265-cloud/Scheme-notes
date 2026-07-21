import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${SITE.name} — ${SITE.tagline}`,
};

export default function AboutPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          About SchemNotes
        </h1>
        <div className="mt-6 space-y-4 leading-relaxed text-foreground/70">
          <p>
            <strong className="text-foreground">SchemNotes</strong> is a lightweight tool for
            reviewing circuit schematics. Upload a schematic (image, PDF, or a native KiCad file),
            share a link, and let reviewers click anywhere on the diagram to drop a comment pin —
            like Google Docs comments, but anchored to the drawing.
          </p>
          <p>
            It exists to make schematic feedback simple: no CAD software to install, and no account
            required just to comment. Engineers, students, and hardware teams use it to review board
            designs together.
          </p>
          <h2 className="pt-4 font-display text-xl font-semibold text-foreground">Who runs it</h2>
          <p>
            SchemNotes is owned and published by <strong className="text-foreground">SchemNotes</strong>.
            It is an independent project; the full source code is public on{" "}
            <a
              href={SITE.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline dark:text-indigo-400"
            >
              GitHub
            </a>
            .
          </p>
          <h2 className="pt-4 font-display text-xl font-semibold text-foreground">Contact</h2>
          <p>
            Questions, bug reports, or feature requests are welcome via the{" "}
            <a
              href={`${SITE.github}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline dark:text-indigo-400"
            >
              GitHub issues page
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
