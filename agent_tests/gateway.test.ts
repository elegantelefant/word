// ABOUTME: Tests for the Pydantic AI gateway client (BYOK review).
// ABOUTME: Verifies request formatting, response parsing, and error handling.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { reviewViaGateway } from "@/api/gateway";


beforeEach(() => {
  vi.restoreAllMocks();
});

describe("reviewViaGateway", () => {
  it("sends correct request to gateway", async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            summary: "No issues found.",
            issues: [],
          }),
        },
      }],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    await reviewViaGateway("Test clause text", "sk-test-key", "claude-sonnet-4-20250514");

    const call = vi.mocked(fetch).mock.calls[0]!;
    expect(call[0]).toContain("/v1/chat/completions");
    expect(call[1]!.method).toBe("POST");
    expect((call[1]!.headers as Record<string, string>)["Authorization"]).toBe("Bearer sk-test-key");
  });

  it("parses valid JSON response into ReviewResponse", async () => {
    const reviewData = {
      summary: "Two issues found.",
      issues: [
        { message: "Vague termination clause", kind: "ambiguity", location: "Section 5.1" },
        { message: "Missing force majeure", kind: "missing" },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(reviewData) } }],
      })),
    );

    const result = await reviewViaGateway("text", "key", "model");

    expect(result.summary).toBe("Two issues found.");
    expect(result.issues).toHaveLength(2);
    expect(result.issues![0]!.kind).toBe("ambiguity");
    expect(result.issues![1]!.kind).toBe("missing");
  });

  it("handles non-JSON LLM response gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({
        choices: [{ message: { content: "This looks fine to me, no issues." } }],
      })),
    );

    const result = await reviewViaGateway("text", "key", "model");

    expect(result.summary).toBe("This looks fine to me, no issues.");
    expect(result.issues).toEqual([]);
  });

  it("normalizes invalid issue kinds to 'other'", async () => {
    const reviewData = {
      summary: "One issue.",
      issues: [{ message: "Bad clause", kind: "critical" }],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(reviewData) } }],
      })),
    );

    const result = await reviewViaGateway("text", "key", "model");
    expect(result.issues![0]!.kind).toBe("other");
  });

  it("throws on non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );

    await expect(reviewViaGateway("text", "bad-key", "model")).rejects.toThrow("Gateway error (401)");
  });

  it("includes custom instructions in user prompt", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ summary: "ok", issues: [] }) } }],
      })),
    );

    await reviewViaGateway("text", "key", "model", "Focus on IP clauses");

    const call = vi.mocked(fetch).mock.calls[0]!;
    const body = JSON.parse(call[1]!.body as string);
    expect(body.messages[1].content).toContain("Focus on IP clauses");
  });
});
