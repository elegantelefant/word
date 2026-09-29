// ABOUTME: Tests which host the free-tier Gemini client sends the key and document to.
// ABOUTME: Default is Google's own endpoint; VITE_GEMINI_BASE_URL is an explicit opt-in proxy.

import { describe, it, expect, afterEach, vi } from "vitest";

// The adk shim also loads llm_agent.js, whose web build Node cannot parse
// ('super' in an async generator). Load the real Gemini model; the agent and
// runner only hold their config, so the review runner's model is reachable.
vi.mock("@google/adk", async () => ({
  // @ts-expect-error — deep import from the web build, no type declarations
  Gemini: (await import("../node_modules/@google/adk/dist/web/models/google_llm.js")).Gemini,
  LlmAgent: class { constructor(public config: { model: unknown }) {} },
  InMemoryRunner: class { constructor(public config: { agent: unknown }) {} },
}));

const GOOGLE_ENDPOINT = "https://generativelanguage.googleapis.com/";
const PROXY_ENDPOINT = "https://proxy.example.test/google";

async function geminiBaseUrl(): Promise<string> {
  vi.resetModules();
  const { createReviewRunner } = await import("@/lib/agent");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runner = createReviewRunner("test-key") as any;
  return runner.config.agent.config.model.apiClient.apiClient.getBaseUrl();
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
