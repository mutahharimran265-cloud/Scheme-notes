// Clipboard-image helpers for the comment textareas: paste a scope capture
// or meter photo, it uploads to /api/attachments and inserts markdown.

export function imageFromClipboard(e: React.ClipboardEvent): File | null {
  for (const item of Array.from(e.clipboardData?.items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  return null;
}

export async function uploadPastedImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/attachments", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Image upload failed.");
  return data.url as string;
}

/** Insert text at the textarea caret; returns the new value + caret position. */
export function insertAtCursor(
  el: HTMLTextAreaElement | null,
  value: string,
  text: string,
): { next: string; caret: number } {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const next = value.slice(0, start) + text + value.slice(end);
  return { next, caret: start + text.length };
}
