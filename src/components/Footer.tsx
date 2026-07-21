import Link from "next/link";
import { SITE, CURRENT_YEAR } from "@/lib/site";

// Site-wide footer with owner/publisher info + trust links. Rendered on every
// page from the root layout.
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-black/[0.06] bg-background/60 px-4 py-8 text-sm sm:px-6 dark:border-white/[0.08]">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="font-display font-semibold text-foreground">{SITE.name}</p>
          <p className="text-foreground/50">{SITE.tagline}</p>
          <p className="mt-1 text-xs text-foreground/40">
            © {CURRENT_YEAR} {SITE.owner}. All rights reserved.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-foreground/60">
          <Link href="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <a
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
