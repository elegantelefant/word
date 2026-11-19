// ABOUTME: Playwright config for local e2e testing of the Word add-in.
// ABOUTME: Runs Vite dev server and tests in Chromium headless.

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3001",
    headless: true,
    viewport: { width: 350, height: 700 },
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
  webServer: {
    command: "pnpm vite --port 3001 --host localhost",
    url: "http://localhost:3001",
    env: { DEV_SERVER_HTTP: "1" },
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
