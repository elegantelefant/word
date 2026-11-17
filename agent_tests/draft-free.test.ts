// ABOUTME: Tests free-tier (BYOK) drafting: real ADK LlmAgent and runner, only the model's network call replaced.
// ABOUTME: Proves a clause comes back as plain text and that Gemini errors read the same as in review.

import { describe, it, expect, vi } from "vitest";

const modelReply = vi.hoisted(() => ({ text: "", error: "" }));

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

  class FakeGemini extends BaseLlm {
    constructor(config: { model: string }) {
      super(config);
    }
    async *generateContentAsync() {
      if (modelReply.error) throw new Error(modelReply.error);
      yield { content: { role: "model", parts: [{ text: modelReply.text }] } };
    }
  }

  return { LlmAgent, InMemoryRunner, Gemini: FakeGemini };
});

describe("runDraft (BYOK)", () => {
  it("returns the drafted clause text", async () => {
    modelReply.error = "";
    modelReply.text = JSON.stringify({ draft: "Each party shall keep the other's Confidential Information secret." });
    const { runDraft } = await import("@/lib/agent");

    await expect(runDraft("key", "gemini-4-hydrogen", "a mutual confidentiality clause", "")).resolves.toBe(
      "Each party shall keep the other's Confidential Information secret.",
    );
  });

  it("maps a Gemini 429 to the same usage-limit message review uses", async () => {
    modelReply.error = JSON.stringify({ error: { code: 429, message: "Resource has been exhausted.", status: "RESOURCE_EXHAUSTED" } });
    const { runDraft } = await import("@/lib/agent");

    await expect(runDraft("key", "gemini-4-hydrogen", "a mutual confidentiality clause", "")).rejects.toThrow(
      "Gemini's usage limit was reached. Try again in a little while.",
    );
  });

  it("refuses an empty draft rather than inserting nothing", async () => {
    modelReply.error = "";
    modelReply.text = JSON.stringify({ draft: "   " });
    const { runDraft } = await import("@/lib/agent");

    await expect(runDraft("key", "gemini-4-hydrogen", "a clause", "")).rejects.toThrow("The draft came back empty.");
  });
});
