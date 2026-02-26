// ABOUTME: Test setup — mocks Office.js globals and import.meta.env.
// ABOUTME: Provides minimal stubs so tests run outside Office environment.

import "@testing-library/jest-dom/vitest";

// Mock import.meta.env
Object.defineProperty(import.meta, "env", {
  value: {
    VITE_API_URL: "https://test-api.elefant.legal",
    VITE_GATEWAY_URL: "https://test-gateway.elefant.legal",
  },
});
