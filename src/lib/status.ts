// Shared display metadata for the comment status workflow.
export type CommentStatus = "open" | "in_review" | "resolved" | "wontfix";

export const STATUS_ORDER: CommentStatus[] = [
  "open",
  "in_review",
  "resolved",
  "wontfix",
];

export const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  wontfix: "Won't fix",
};

/** Pin marker background per status. */
export const STATUS_PIN_BG: Record<string, string> = {
  open: "bg-indigo-600",
  in_review: "bg-sky-500",
  resolved: "bg-emerald-600",
  wontfix: "bg-amber-500",
};

/** Small text-badge classes per status. */
export const STATUS_BADGE: Record<string, string> = {
  open: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  in_review: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  resolved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  wontfix: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

/** Resolve the effective status, falling back to the legacy `resolved` flag. */
export function statusOf(t: { status?: string | null; resolved?: boolean }): CommentStatus {
  if (
    t.status === "open" ||
    t.status === "in_review" ||
    t.status === "resolved" ||
    t.status === "wontfix"
  ) {
    return t.status;
  }
  return t.resolved ? "resolved" : "open";
}

/** Outstanding = still needs engineering attention. */
export function isOutstanding(t: { status?: string | null; resolved?: boolean }): boolean {
  const s = statusOf(t);
  return s === "open" || s === "in_review";
}

/**
 * Whether a status counts as "addressed" for the legacy `resolved` boolean.
 * Only resolved/wontfix are resolved — "in_review" is still outstanding. Kept
 * identical to the server (comments/[id] PATCH) so optimistic UI matches.
 */
export function isResolvedStatus(status: CommentStatus): boolean {
  return status === "resolved" || status === "wontfix";
}
