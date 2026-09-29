// ABOUTME: Tests for review API — verifies free-tier routes through ADK agent.
// ABOUTME: Tests paid-tier dispatches to Elefant API with job polling.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { reviewFree, reviewPaid } from "@/api/review";

beforeEach(() => {
  vi.restoreAllMocks();
});

vi.mock("@/lib/agent", () => ({
  runReview: vi.fn(),
}));

vi.mock("@/lib/polling", () => ({
  pollForResult: vi.fn(),
}));

describe("reviewFree", () => {
  it("calls runReview and maps result to the review view (suggestion stays insertable, no verdict)", async () => {
    const { runReview } = await import("@/lib/agent");
    vi.mocked(runReview).mockResolvedValueOnce({
      summary: "Contract looks solid.",
      issues: [
        { message: "Vague termination", kind: "ambiguity", location: "Section 3", suggestion: "Add specifics" },
        { message: "Missing indemnity", kind: "missing" },
      ],
    });

    const result = await reviewFree("test text", "AIza-test", "gemini-2.5-flash");

    expect(runReview).toHaveBeenCalledWith("AIza-test", "gemini-2.5-flash", "test text", undefined);
    expect(result.summary).toBe("Contract looks solid.");
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0]).toEqual({
      description: "Vague termination",
      category: "ambiguity",
      clauseReference: "Section 3",
      recommendation: "",
      suggestion: "Add specifics",
      severity: "",
      sourceFilename: "",
      explanation: "",
    });
    expect(result.issues[1]).toEqual({
      description: "Missing indemnity",
      category: "missing",
      clauseReference: "",
      recommendation: "",
      severity: "",
      sourceFilename: "",
      explanation: "",
    });
  });

  it("passes custom instructions to runReview", async () => {
    const { runReview } = await import("@/lib/agent");
    vi.mocked(runReview).mockResolvedValueOnce({ summary: "ok", issues: [] });

    await reviewFree("text", "key", "model", "Focus on IP");

    expect(runReview).toHaveBeenCalledWith("key", "model", "text", "Focus on IP");
  });

  it("propagates agent errors", async () => {
    const { runReview } = await import("@/lib/agent");
    vi.mocked(runReview).mockRejectedValueOnce(new Error("API key invalid"));

    await expect(reviewFree("text", "bad-key", "model")).rejects.toThrow("API key invalid");
  });
});

describe("reviewPaid", () => {
  it("creates job and polls for result", async () => {
    const { pollForResult } = await import("@/lib/polling");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ jobId: "j1", pollUrl: "/jobs/j1" })),
    );
    vi.mocked(pollForResult).mockResolvedValueOnce({
      id: "j1",
      status: "completed",
      result: { summary: "Reviewed.", issues: [] },
    });

    const result = await reviewPaid("text", "token-123");

    expect(fetch).toHaveBeenCalled();
    expect(pollForResult).toHaveBeenCalledWith("j1", "token-123");
    expect(result.summary).toBe("Reviewed.");
  });
});
