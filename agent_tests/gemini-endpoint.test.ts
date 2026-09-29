// ABOUTME: Tests which host the free-tier Gemini client sends the key and document to.
// ABOUTME: Default is Google's own endpoint; VITE_GEMINI_BASE_URL is an explicit opt-in proxy.

import { describe, it, expect, afterEach, vi } from "vitest";

// The adk shim also loads llm_agent.js, whose web build Node cannot parse
// ('super' in an async generator), so load only the real Gemini model.
vi.mock("@google/adk", async () => ({
  // @ts-expect-error — deep import from the web build, no type declarations
  Gemini: (await import("../node_modules/@google/adk/dist/web/models/google_llm.js")).Gemini,
}));

const GOOGLE_ENDPOINT = "https://generativelanguage.googleapis.com/";
const PROXY_ENDPOINT = "https://proxy.example.test/google";

async function geminiBaseUrl(): Promise<string> {
  vi.resetModules();
  const { createGemini } = await import("@/lib/gemini");
  return createGemini("test-key").apiClient.apiClient.getBaseUrl();
}

describe("free-tier Gemini endpoint", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("goes direct to Google when no override is set", async () => {
    vi.stubEnv("VITE_GEMINI_BASE_URL", "");
    expect(await geminiBaseUrl()).toBe(GOOGLE_ENDPOINT);
  });

  it("goes through the proxy when VITE_GEMINI_BASE_URL is set", async () => {
    vi.stubEnv("VITE_GEMINI_BASE_URL", PROXY_ENDPOINT);
    expect(await geminiBaseUrl()).toBe(PROXY_ENDPOINT);
  });
});
