"use client";

import { useEffect, useRef, useState } from "react";
import { imageFromClipboard, uploadPastedImage, insertAtCursor } from "@/lib/paste";

export type ComposerExtras = {
  tags: string[];
  componentRef?: string;
  partNumber?: string;
  datasheetUrl?: string;
};

type Props = {
  authorName: string | null;
  busy?: boolean;
  onSubmit: (body: string, extras: ComposerExtras) => void;
  onCancel: () => void;
};

/** Compact popover for typing a brand-new comment at a freshly dropped pin. */
export default function PinComposer({ authorName, busy, onSubmit, onCancel }: Props) {
  const [body, setBody] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [tagsText, setTagsText] = useState("");
  const [componentRef, setComponentRef] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [datasheetUrl, setDatasheetUrl] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => ref.current?.focus());
  }, []);

  async function onPaste(e: React.ClipboardEvent) {
    const img = imageFromClipboard(e);
    if (!img) return;
    e.preventDefault();
    setPasting(true);
    setPasteError(null);
    try {
      const url = await uploadPastedImage(img);
      const { next, caret } = insertAtCursor(ref.current, body, `![image](${url})`);
      setBody(next);
      requestAnimationFrame(() => ref.current?.setSelectionRange(caret, caret));
    } catch (err) {
      setPasteError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setPasting(false);
    }
  }

  function submit() {
    if (!body.trim()) return;
    const tags = tagsText
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 10);
    onSubmit(body.trim(), {
      tags,
      componentRef: componentRef.trim() || undefined,
      partNumber: partNumber.trim() || undefined,
      datasheetUrl: datasheetUrl.trim() || undefined,
    });
  }

  const fieldCls =
    "w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950";

  return (
    <div className="w-80 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">
          {authorName ? `New comment as ${authorName}` : "New comment"}
        </span>
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="grid h-5 w-5 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
        >
          ✕
        </button>
      </div>
      <textarea
        ref={ref}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        onPaste={onPaste}
        rows={3}
        maxLength={4000}
        placeholder="Add your feedback… (markdown + pasted images supported)"
        className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
      />
      {pasting && <p className="mt-1 text-xs text-zinc-400">Uploading image…</p>}
      {pasteError && <p className="mt-1 text-xs text-red-600">{pasteError}</p>}

      <button
        type="button"
        onClick={() => setShowDetails((s) => !s)}
        className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
      >
        {showDetails ? "− Hide details" : "+ Tags & component"}
      </button>

      {showDetails && (
        <div className="mt-2 flex flex-col gap-2">
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="Tags, comma separated (power, emi)"
            maxLength={200}
            className={fieldCls}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={componentRef}
              onChange={(e) => setComponentRef(e.target.value)}
              placeholder="Ref (R12, U3)"
              maxLength={40}
              className={`${fieldCls} font-mono`}
            />
            <input
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="Part number"
              maxLength={80}
              className={fieldCls}
            />
          </div>
          <input
            value={datasheetUrl}
            onChange={(e) => setDatasheetUrl(e.target.value)}
            placeholder="Datasheet URL (https://…)"
            maxLength={300}
            className={fieldCls}
          />
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">⌘/Ctrl + Enter</span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!body.trim() || busy}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Posting…" : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}
