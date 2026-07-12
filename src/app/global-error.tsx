"use client";

import { useEffect } from "react";

// Last-resort boundary for errors thrown in the root layout itself (where the
// normal error.tsx can't render because it lives inside that layout). Must
// render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("SchemNotes crashed:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
          background: "#0b1020",
          color: "#e7ebf5",
        }}
      >
        <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#8b98b8", marginBottom: 20 }}>
            The app hit an unexpected error. Please reload the page.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
