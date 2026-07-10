import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored, minified third-party file (pdf.js worker) — not our code to lint.
    "public/**",
  ]),
  {
    rules: {
      // Fetching on mount via a load() call in an effect is intentional and
      // correct throughout the dashboard/panels. This strict React-Compiler rule
      // treats the pattern as a perf hint; keep it a warning, not a build error.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
