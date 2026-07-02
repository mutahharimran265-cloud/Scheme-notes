import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { getSessionEmail } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SchemNotes — comment on circuit schematics",
  description:
    "Upload a circuit schematic, share a link, and let reviewers drop comment pins right on the diagram.",
};

function LogoMark() {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow-sm ring-1 ring-white/20">
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="2.6" />
        <path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21" />
      </svg>
    </span>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const email = await getSessionEmail();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-black/[0.06] bg-background/75 px-4 backdrop-blur-xl sm:px-6 dark:border-white/[0.08]">
          <Link href="/" className="group flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-[15px] font-bold tracking-tight">
              SchemNotes
            </span>
          </Link>

          {email ? (
            <div className="flex items-center gap-1 text-sm">
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 font-medium text-foreground/70 transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
              >
                My projects
              </Link>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 font-medium text-foreground/50 transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-foreground/[0.06] px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.1] dark:bg-white/[0.08] dark:hover:bg-white/[0.14]"
            >
              Sign in
            </Link>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
