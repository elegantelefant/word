// ABOUTME: Test setup — mocks Office.js globals and import.meta.env.
// ABOUTME: Provides minimal stubs so tests run outside Office environment.

import "@testing-library/jest-dom/vitest";

// Mock import.meta.env
Object.defineProperty(import.meta, "env", {
  value: {
    VITE_API_URL: "https://test-api.elefant.legal",
  },
});

// Node 25 has a built-in localStorage that conflicts with jsdom.
// Ensure we have a spec-compliant localStorage for tests.
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.clear !== "function") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
  } as Storage;
}
