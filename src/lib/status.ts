// Shared display metadata for the comment status workflow.
export type CommentStatus = "open" | "resolved" | "wontfix";

export const STATUS_ORDER: CommentStatus[] = ["open", "resolved", "wontfix"];

export const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  resolved: "Resolved",
  wontfix: "Won't fix",
};

/** Pin marker background per status. */
export const STATUS_PIN_BG: Record<string, string> = {
  open: "bg-indigo-600",
  resolved: "bg-emerald-600",
  wontfix: "bg-amber-500",
};

/** Small text-badge classes per status. */
export const STATUS_BADGE: Record<string, string> = {
  open: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  resolved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  wontfix: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

/** Resolve the effective status, falling back to the legacy `resolved` flag. */
export function statusOf(t: { status?: string | null; resolved?: boolean }): CommentStatus {
  if (t.status === "resolved" || t.status === "wontfix" || t.status === "open") {
    return t.status;
  }
  return t.resolved ? "resolved" : "open";
}
