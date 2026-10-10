import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
    },
  },
  test: {
    environment: "node",
    exclude: ["node_modules", "tests/e2e/**"],
    // Unit tests run against the volatile in-memory adapters, never a live
    // database — even though a local .env exists on this machine.
    env: {
      DATABASE_URL: "",
      DIRECT_URL: "",
    },
  },
});
