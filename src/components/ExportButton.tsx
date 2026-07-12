"use client";

// Header "Export PDF" button. The export is ONE file: the schematic with its
// comment pins drawn on it, followed by the comment list — nothing else.
// The PDF itself is built inside ProjectWorkspace (it owns the live comment
// state), so this button just asks it to run via a window event.
export const EXPORT_PDF_EVENT = "schemnotes:export-pdf";

export default function ExportButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(EXPORT_PDF_EVENT))}
      title="Download this schematic with its comments as a PDF"
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      Export PDF
    </button>
  );
}
