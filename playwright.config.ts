import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
  },
  // Reuses your `npm run dev` server when already running; starts one otherwise.
  webServer: {
    command: "npm.cmd run dev -- --port 3000",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
