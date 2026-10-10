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
    // Hand-rolled service worker (browser globals, not app code):
    "public/sw.js",
    // One-off icon generator (plain Node script, run manually):
    "scripts/generate-icons.cjs",
  ]),
]);

export default eslintConfig;
