// ABOUTME: Vitest configuration for unit testing.
// ABOUTME: Uses jsdom for DOM tests, resolves @ alias.

import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["agent_tests/**/*.test.{ts,tsx}"],
    globals: true,
    setupFiles: ["agent_tests/setup.ts"],
  },
});
