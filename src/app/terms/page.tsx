import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import { SITE, CURRENT_YEAR } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `Terms of use for ${SITE.name}.`,
};

export default function TermsPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-foreground/45">Last updated: {CURRENT_YEAR}</p>
        <div className="mt-6 space-y-4 leading-relaxed text-foreground/70">
          <p>
            By using {SITE.name}, you agree to these terms. If you don&apos;t agree, please
            don&apos;t use the service.
          </p>

          <h2 className="pt-3 font-display text-lg font-semibold text-foreground">Your content</h2>
          <p>
            You keep ownership of the schematics and comments you upload. You are responsible for
            having the right to upload them, and for not uploading anything unlawful, infringing, or
            malicious.
          </p>

          <h2 className="pt-3 font-display text-lg font-semibold text-foreground">Acceptable use</h2>
          <p>
            Don&apos;t use the service to break the law, to upload malware, or to attempt to disrupt
            or gain unauthorized access to it or to other users&apos; data.
          </p>

          <h2 className="pt-3 font-display text-lg font-semibold text-foreground">
            Service &ldquo;as is&rdquo;
          </h2>
          <p>
            {SITE.name} is provided on an &ldquo;as is&rdquo; basis without warranties of any kind.
            We do our best to keep it working and your data safe, but we can&apos;t guarantee
            uninterrupted availability, and we&apos;re not liable for any loss arising from use of
            the service. Keep your own copies of anything important.
          </p>

          <h2 className="pt-3 font-display text-lg font-semibold text-foreground">Changes</h2>
          <p>
            These terms may be updated over time; continued use after a change means you accept the
            updated terms. © {CURRENT_YEAR} {SITE.owner}.
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
