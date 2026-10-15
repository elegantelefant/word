// ABOUTME: Tests that runReview surfaces what actually happened, not ADK's generic fallback.
// ABOUTME: Drives a real ADK run with a failing model, so errorCode/errorMessage are ADK's own.

import { describe, it, expect, vi } from "vitest";

// The app's @google/adk shim points LlmAgent/InMemoryRunner at the web build,
// which Node can't parse (a 'super' in an async generator). The esm build of
// the same classes parses and runs fine, and is the real, unmodified ADK
// code — the fake model below only replaces the network call a real Gemini
// client would make, so the resulting events (including errorCode/errorMessage)
// are produced by ADK's own LlmAgent.runAndHandleError, not hand-built.
const errorMessageRef = vi.hoisted(() => ({ current: "" }));

vi.mock("@google/adk", async () => {
  const { LlmAgent } = await import(
    // @ts-expect-error — deep import from the esm build, no type declarations
    "../node_modules/@google/adk/dist/esm/agents/llm_agent.js"
  );
  const { InMemoryRunner } = await import(
    // @ts-expect-error
    "../node_modules/@google/adk/dist/esm/runner/in_memory_runner.js"
  );
  const { BaseLlm } = await import(
    // @ts-expect-error
    "../node_modules/@google/adk/dist/esm/models/base_llm.js"
  );

  class FakeFailingLlm extends BaseLlm {
    constructor(config: { model: string }) {
      super(config);
    }
    // eslint-disable-next-line require-yield
    async *generateContentAsync(): AsyncGenerator<never> {
      throw new Error(errorMessageRef.current);
    }
  }

  return { LlmAgent, InMemoryRunner, Gemini: FakeFailingLlm };
});

/** The JSON body Google's API actually returns on an error response. */
function googleError(code: number, message: string, status: string): string {
  return JSON.stringify({ error: { code, message, status } });
}

describe("runReview error messages", () => {
  it("maps a 400 'API key' error to a Settings-pointing message", async () => {
    errorMessageRef.current = googleError(400, "API key not valid. Please pass a valid API key.", "INVALID_ARGUMENT");
    const { runReview } = await import("@/lib/agent");

    await expect(runReview("bad-key", "gemini-2.5-flash", "Review this contract clause please.")).rejects.toThrow(
      "Your Gemini API key wasn't accepted. Check it in Settings.",
    );
  });

  it("maps a 429 to a usage-limit message", async () => {
    errorMessageRef.current = googleError(429, "Resource has been exhausted (e.g. check quota).", "RESOURCE_EXHAUSTED");
    const { runReview } = await import("@/lib/agent");

    await expect(runReview("key", "gemini-2.5-flash", "Review this contract clause please.")).rejects.toThrow(
      "Gemini's usage limit was reached. Try again in a little while.",
    );
  });

  it("maps an unrecognised code to a generic message naming the code", async () => {
    errorMessageRef.current = googleError(500, "Internal error.", "INTERNAL");
    const { runReview } = await import("@/lib/agent");

    await expect(runReview("key", "gemini-2.5-flash", "Review this contract clause please.")).rejects.toThrow(
      "Gemini returned an error (code 500). Try again.",
    );
  });
});
