import Link from "next/link";
import UploadForm from "@/components/UploadForm";
import HeroPreview from "@/components/HeroPreview";

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

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 stroke-emerald-500 stroke-2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlanCard({
  name,
  price,
  cadence,
  tagline,
  features,
  cta,
  ctaHref,
  featured,
  note,
}: {
  name: string;
  price: string;
  cadence?: string;
  tagline: string;
  features: string[];
  cta: string;
  ctaHref?: string;
  featured?: boolean;
  note?: string;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 ${
        featured
          ? "border-indigo-500/40 bg-white shadow-[0_1px_2px_rgba(16,24,40,.04),0_24px_48px_-24px_rgba(79,70,229,.35)] dark:bg-zinc-900"
          : "border-black/[0.08] bg-white/70 dark:border-white/[0.08] dark:bg-white/[0.03]"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          Most popular
        </span>
      )}
      <h3 className="font-display text-lg font-bold text-foreground">{name}</h3>
      <p className="mt-1 text-sm text-foreground/55">{tagline}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-3xl font-bold text-foreground">{price}</span>
        {cadence && <span className="text-sm text-foreground/50">{cadence}</span>}
      </div>
      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-sm text-foreground/70">
            <Check />
            {f}
          </li>
        ))}
      </ul>
      {ctaHref ? (
        <Link
          href={ctaHref}
          className={`mt-6 grid place-items-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
            featured
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "border border-black/10 text-foreground hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
          }`}
        >
          {cta}
        </Link>
      ) : (
        <span className="mt-6 grid cursor-default place-items-center rounded-xl border border-dashed border-black/10 px-4 py-2.5 text-sm font-medium text-foreground/45 dark:border-white/15">
          {cta}
        </span>
      )}
      {note && <p className="mt-2 text-center text-xs text-foreground/40">{note}</p>}
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

        <HeroPreview />

        <div className="mx-auto mt-14 max-w-xl text-center">
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            Try it now — no sign-up
          </h2>
        </div>

        <div className="mx-auto mt-5 max-w-xl">
          <div className="rounded-[22px] border border-black/[0.07] bg-white/70 p-1.5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_24px_48px_-24px_rgba(30,27,75,.35)] backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.04]">
            <div className="rounded-2xl bg-white p-6 dark:bg-zinc-950/60">
              <UploadForm />
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-foreground/40">
            Free forever for solo use · runs fully offline · your data stays on your machine
          </p>
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
            Comments stick to an exact spot at any zoom — link them to a
            component ref, part number, and datasheet.
          </Feature>
          <Feature
            title="Native KiCad + more"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="2.6" />
                <path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21" />
              </svg>
            }
          >
            Drop a <code>.kicad_sch</code>, PDF, SVG, or image. Paste scope
            captures straight into a comment.
          </Feature>
          <Feature
            title="Triage like a PR"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            }
          >
            Open · In review · Resolved · Won&apos;t fix, with ⌘K search and a
            one-click Markdown export for your punch-list.
          </Feature>
        </div>

        {/* Pricing */}
        <section id="pricing" className="mt-24 scroll-mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Simple pricing
            </h2>
            <p className="mt-3 text-foreground/60">
              The full review tool is free and local, forever. Paid plans add
              cloud sync and team collaboration when you need them.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-3">
            <PlanCard
              name="Free"
              price="$0"
              tagline="Everything to review schematics solo."
              features={[
                "Unlimited projects & comments",
                "KiCad, PDF, SVG & image upload",
                "Status workflow + ⌘K search",
                "Markdown notes & pasted images",
                "Export all data, automatic backups",
                "Fully offline — data never leaves your machine",
              ]}
              cta="Start now — it's free"
              ctaHref="#top"
            />
            <PlanCard
              name="Pro"
              price="$8"
              cadence="/ month"
              tagline="For engineers across machines."
              features={[
                "Everything in Free",
                "Cloud sync across devices",
                "Revision history & cloud backup",
                "Priority support",
              ]}
              cta="Coming soon"
              featured
              note="Cloud sync is on the way."
            />
            <PlanCard
              name="Team"
              price="$19"
              cadence="/ user / mo"
              tagline="For hardware teams."
              features={[
                "Everything in Pro",
                "Shared workspaces & @-mentions",
                "Roles & permissions",
                "Slack / GitHub / Jira integrations",
              ]}
              cta="Talk to us"
              note="Self-hosted license for data-sensitive orgs."
            />
          </div>
        </section>

        <footer className="mt-20 border-t border-black/[0.06] pt-6 text-center text-xs text-foreground/40 dark:border-white/[0.08]">
          SchemNotes — lightweight, CAD-agnostic schematic review. Free and
          local-first.
        </footer>
      </div>
    </main>
  );
}
