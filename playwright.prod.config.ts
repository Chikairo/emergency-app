import { defineConfig } from "@playwright/test";

// Production-mode e2e: runs against `next start` (prebuilt output) instead
// of `next dev`. Turbopack dev file-watching can reload pages mid-test on
// some machines, making navigation assertions flaky; the production server
// is deterministic. Build first with `npm run build`.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
  },
  webServer: {
    command: "npm.cmd run start -- --port 3100",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
