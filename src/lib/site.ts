// Site-wide owner / identity info. One source of truth for the footer, the
// About/Privacy/Terms pages, the SEO metadata, and the JSON-LD structured data
// that tells Google who publishes this site.

export const SITE = {
  name: "SchemNotes",
  tagline: "Comment on circuit schematics — anchored to the diagram.",
  description:
    "Upload a circuit schematic, share a link, and let reviewers drop comment pins right on the diagram. No CAD software to install, no account required to comment.",
  owner: "SchemNotes",
  github: "https://github.com/mutahharimran265-cloud/Scheme-notes",
  /** Public base URL — set NEXT_PUBLIC_APP_URL in production so links/OG tags
   *  point at the real domain. Falls back to Vercel's URL, then localhost. */
  url:
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_ORIGIN?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
} as const;

export const CURRENT_YEAR = new Date().getFullYear();
