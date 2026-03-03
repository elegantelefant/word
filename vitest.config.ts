// ABOUTME: Vitest configuration for unit testing.
// ABOUTME: Uses jsdom for DOM tests, resolves @ and @google/adk aliases.

import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@google/adk": resolve(__dirname, "src/lib/adk-shim.ts"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["agent_tests/**/*.test.{ts,tsx}"],
    globals: true,
    setupFiles: ["agent_tests/setup.ts"],
  },
});
