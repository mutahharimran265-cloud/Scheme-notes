import UploadForm from "@/components/UploadForm";

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white/60 p-4 backdrop-blur-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-foreground/55">{children}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 hero-glow" />
      <div className="pointer-events-none absolute inset-0 -z-10 bp-grid-lg" />

      <div className="mx-auto w-full max-w-5xl px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rise inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/[0.07] px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Schematic review, without the CAD tax
          </span>

          <h1 className="rise mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            Comments that stick to
            <br className="hidden sm:block" />{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-sky-400 bg-clip-text text-transparent">
              your schematic
            </span>
            .
          </h1>

          <p className="rise-2 mx-auto mt-5 max-w-xl text-lg leading-relaxed text-foreground/60">
            Upload a diagram, share one link, and get pin-point feedback from
            anyone — no CAD software to install, no account to comment.
          </p>
        </div>

        <div className="rise-3 mx-auto mt-10 max-w-xl">
          <div className="rounded-[22px] border border-black/[0.07] bg-white/70 p-1.5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_24px_48px_-24px_rgba(30,27,75,.35)] backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.04]">
            <div className="rounded-2xl bg-white p-6 dark:bg-zinc-950/60">
              <UploadForm />
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-3">
          <Feature
            title="Pin-point anchored"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            }
          >
            Every comment sticks to an exact spot on the diagram — at any zoom.
          </Feature>
          <Feature
            title="Share one link"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4.93" />
                <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 19.07" />
              </svg>
            }
          >
            Reviewers just open it in a browser. No installs, no logins to comment.
          </Feature>
          <Feature
            title="Resolve like a PR"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            }
          >
            Thread replies and close each note the moment it&apos;s handled.
          </Feature>
        </div>
      </div>
    </main>
  );
}
