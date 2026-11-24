// ABOUTME: Tests that a free-tier Gemini request ends: a deadline, a cancel, one retry on 503, then the other listed models.
// ABOUTME: Real ADK agent, runner and Gemini client; only the network (fetch) is replaced.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GEMINI_MODELS } from "@/lib/models";

// The web build of llm_agent.js does not parse in Node ('super' in an async generator);
// the esm build is the same unmodified ADK code (see review-error-messages.test.ts).
vi.mock("@google/adk", async () => ({
  // @ts-expect-error — deep import from the esm build, no type declarations
  LlmAgent: (await import("../node_modules/@google/adk/dist/esm/agents/llm_agent.js")).LlmAgent,
  // @ts-expect-error
  InMemoryRunner: (await import("../node_modules/@google/adk/dist/esm/runner/in_memory_runner.js")).InMemoryRunner,
  // @ts-expect-error
  Gemini: (await import("../node_modules/@google/adk/dist/esm/models/google_llm.js")).Gemini,
}));

const [HYDROGEN, FLASH, FLASH_LITE] = GEMINI_MODELS.map((model) => model.id);
const REVIEW = { summary: "Delivery is unconditional.", issues: [] };

type Reply = "ok" | 503 | 404 | "hang";

/** Google's generateContent, answering per model from a script; records which model each call asked for. */
function stubGoogle(script: Record<string, Reply[]>) {
  const asked: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const model = String(url instanceof Request ? url.url : url).match(/models\/([^:]+):/)![1];
    asked.push(model);
    const reply = script[model]?.shift() ?? "ok";
    if (reply === "hang") {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("This operation was aborted", "AbortError")));
      });
    }
    if (reply === 503) {
      return new Response(JSON.stringify({ error: { code: 503, message: "The model is overloaded.", status: "UNAVAILABLE" } }), { status: 503 });
    }
    if (reply === 404) {
      return new Response(JSON.stringify({ error: { code: 404, message: `models/${model} is not found.`, status: "NOT_FOUND" } }), { status: 404 });
    }
    return new Response(JSON.stringify({
      candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(REVIEW) }] }, finishReason: "STOP" }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
  return asked;
}

async function review(model: string, signal?: AbortSignal) {
  const { runReview } = await import("@/lib/agent");
  return runReview("key", model, "The Supplier shall deliver the Goods.", undefined, signal);
}

beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"], shouldAdvanceTime: true }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("free review against a busy Gemini", () => {
  it("retries the chosen model once after a 503, and says nothing when it then answers", async () => {
    const asked = stubGoogle({ [HYDROGEN]: [503, "ok"] });
    const result = await review(HYDROGEN);
    expect({ asked, answeredBy: result.answeredBy }).toEqual({ asked: [HYDROGEN, HYDROGEN], answeredBy: HYDROGEN });
  });

  it("falls back to the next listed model when the retry also returns 503", async () => {
    const asked = stubGoogle({ [HYDROGEN]: [503, 503] });
    const result = await review(HYDROGEN);
    expect({ asked, answeredBy: result.answeredBy }).toEqual({ asked: [HYDROGEN, HYDROGEN, FLASH], answeredBy: FLASH });
  });

  it("tries the other listed models in order after the chosen one", async () => {
    const asked = stubGoogle({ [FLASH_LITE]: [503, 503], [HYDROGEN]: [503] });
    const result = await review(FLASH_LITE);
    expect({ asked, answeredBy: result.answeredBy }).toEqual({ asked: [FLASH_LITE, FLASH_LITE, HYDROGEN, FLASH], answeredBy: FLASH });
  });

  it("moves past a fallback model that fails some other way", async () => {
    const asked = stubGoogle({ [HYDROGEN]: [503, 503], [FLASH]: [404] });
    const result = await review(HYDROGEN);
    expect({ asked, answeredBy: result.answeredBy }).toEqual({ asked: [HYDROGEN, HYDROGEN, FLASH, FLASH_LITE], answeredBy: FLASH_LITE });
  });

  it("says Google's free tier is busy when every listed model returns 503", async () => {
    stubGoogle({ [HYDROGEN]: [503, 503], [FLASH]: [503], [FLASH_LITE]: [503] });
    await expect(review(HYDROGEN)).rejects.toThrow("Google's free tier is busy right now. Try again in a minute, or use a paid-tier key.");
  });
});

describe("free review that never answers", () => {
  it("gives up at the deadline with a message that says what to do", async () => {
    const { GEMINI_DEADLINE_MS } = await import("@/lib/agent");
    stubGoogle({ [HYDROGEN]: ["hang"] });
    const pending = review(HYDROGEN);
    const settled = expect(pending).rejects.toThrow("Gemini didn't respond. Try again, or choose another model in Settings.");
    await vi.advanceTimersByTimeAsync(GEMINI_DEADLINE_MS);
    await settled;
  });

  it("sends nothing when cancelled before it starts", async () => {
    stubGoogle({});
    const cancel = new AbortController();
    cancel.abort();
    await expect(review(HYDROGEN, cancel.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("stops when cancelled, as an abort rather than an error to show", async () => {
    stubGoogle({ [HYDROGEN]: ["hang"] });
    const cancel = new AbortController();
    const pending = review(HYDROGEN, cancel.signal);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    cancel.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("free draft against a busy Gemini", () => {
  it("retries once after a 503 but never switches model, since a draft has nowhere to say so", async () => {
    const asked = stubGoogle({ [HYDROGEN]: [503, 503] });
    const { runDraft } = await import("@/lib/agent");
    await expect(runDraft("key", HYDROGEN, "A payment clause.", "")).rejects.toThrow("Gemini returned an error (code 503). Try again.");
    expect(asked).toEqual([HYDROGEN, HYDROGEN]);
  });
});
