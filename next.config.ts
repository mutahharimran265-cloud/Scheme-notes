import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Uploaded files (especially user-supplied SVGs) are served from our
        // origin. Sandbox them and block script execution + MIME sniffing so a
        // malicious upload can't run script if opened directly.
        source: "/uploads/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "script-src 'none'; sandbox" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
