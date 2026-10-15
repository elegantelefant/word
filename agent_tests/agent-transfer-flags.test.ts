// ABOUTME: Tests that the legal_reviewer agent sets ADK's transfer flags itself.
// ABOUTME: Catches the console.warn ADK emits when outputSchema is set without them.

import { describe, it, expect, vi } from "vitest";

// The adk shim's web build can't be parsed by Node (a 'super' in an async
// generator inside llm_agent.js) — the same reason agent_tests/gemini-endpoint.test.ts
// mocks @google/adk. Here we need LlmAgent's real constructor logic (the
// warning/flag behaviour under test), so we load it from the esm build
// instead, which Node can parse; InMemoryRunner is stubbed since only the
// agent's own config is under test.
vi.mock("@google/adk", async () => ({
  // @ts-expect-error — deep import from the web build, no type declarations
  Gemini: (await import("../node_modules/@google/adk/dist/web/models/google_llm.js")).Gemini,
  // @ts-expect-error — deep import from the esm build, no type declarations
  LlmAgent: (await import("../node_modules/@google/adk/dist/esm/agents/llm_agent.js")).LlmAgent,
  InMemoryRunner: class {
    constructor(public config: { agent: unknown }) {}
  },
}));

describe("legal_reviewer agent's ADK transfer flags", () => {
  it("constructs with no ADK warning and both transfer flags true", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { createReviewRunner } = await import("@/lib/agent");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runner = createReviewRunner("test-key") as any;

    expect(warnSpy).not.toHaveBeenCalled();
    expect(runner.config.agent.disallowTransferToParent).toBe(true);
    expect(runner.config.agent.disallowTransferToPeers).toBe(true);

    warnSpy.mockRestore();
  });
});
