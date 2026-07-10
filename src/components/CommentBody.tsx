"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { linkifyMentions } from "@/lib/mentions";

/**
 * Renders a comment body as markdown (GFM + soft line breaks).
 * Safety: react-markdown never renders raw HTML; images are restricted to
 * our own /uploads/ (no remote tracking pixels); links open hardened.
 */
export default function CommentBody({ body }: { body: string }) {
  return (
    <div className="mt-0.5 min-w-0 break-words text-sm text-zinc-700 dark:text-zinc-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => {
            const url = typeof src === "string" ? src : "";
            if (!url.startsWith("/uploads/")) {
              // Remote images are rendered as links, never fetched.
              return (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {alt || "image"}
                </a>
              );
            }
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={alt ?? ""}
                loading="lazy"
                className="my-1.5 max-h-64 max-w-full cursor-zoom-in rounded-lg border border-zinc-200 dark:border-zinc-700"
                onClick={() => window.open(url, "_blank", "noopener")}
              />
            );
          },
          ul: ({ children }) => <ul className="my-1 list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-1 list-decimal pl-5">{children}</ol>,
          li: ({ children }) => <li className="my-0.5">{children}</li>,
          code: ({ children, className }) => (
            <code
              className={`rounded bg-zinc-100 px-1 py-0.5 font-mono text-[12px] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 ${className ?? ""}`}
            >
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-1.5 overflow-x-auto rounded-lg bg-zinc-100 p-2.5 text-[12px] dark:bg-zinc-800">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-1.5 border-l-2 border-zinc-300 pl-3 text-zinc-500 dark:border-zinc-600">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => <p className="my-1 font-semibold">{children}</p>,
          h2: ({ children }) => <p className="my-1 font-semibold">{children}</p>,
          h3: ({ children }) => <p className="my-1 font-semibold">{children}</p>,
          table: ({ children }) => (
            <table className="my-1.5 border-collapse text-[12px]">{children}</table>
          ),
          th: ({ children }) => (
            <th className="border border-zinc-300 px-2 py-1 text-left font-semibold dark:border-zinc-600">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-zinc-300 px-2 py-1 dark:border-zinc-600">
              {children}
            </td>
          ),
        }}
      >
        {linkifyMentions(body)}
      </ReactMarkdown>
    </div>
  );
}
