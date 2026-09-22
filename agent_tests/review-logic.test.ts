// ABOUTME: Tests for review API logic — paid path polling, full analysis orchestration.
// ABOUTME: Uses fake fetch responses to test the real orchestration code.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { reviewPaid, runFullAnalysis } from "@/api/review";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("reviewPaid", () => {
  it("creates job then polls to completion", async () => {
    const jobCreated = { jobId: "r1", pollUrl: "/jobs/r1", status: "queued" };
    const jobCompleted = { id: "r1", type: "review", status: "completed", created_at: "2025-01-01" };
    const jobResult = {
      id: "r1",
      status: "completed",
      result: { summary: "Looks good", issues: [] },
    };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(jobCreated))) // POST /review
      .mockResolvedValueOnce(new Response(JSON.stringify(jobCompleted))) // GET /jobs/r1
      .mockResolvedValueOnce(new Response(JSON.stringify(jobResult))); // GET /jobs/r1/result

    const result = await reviewPaid("Some legal text", "token");
    expect(result.summary).toBe("Looks good");
    expect(result.issues).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("passes instructions and context to the API", async () => {
    const jobCreated = { jobId: "r2", pollUrl: "/jobs/r2", status: "queued" };
    const jobCompleted = { id: "r2", type: "review", status: "completed", created_at: "2025-01-01" };
    const jobResult = { id: "r2", status: "completed", result: { summary: "Done", issues: [] } };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(jobCreated)))
      .mockResolvedValueOnce(new Response(JSON.stringify(jobCompleted)))
      .mockResolvedValueOnce(new Response(JSON.stringify(jobResult)));

    await reviewPaid("Text", "token", "Focus on liability", { jurisdiction: "SG" });

    const postCall = vi.mocked(fetch).mock.calls[0]!;
    const body = JSON.parse(postCall[1]!.body as string);
    expect(body.text).toBe("Text");
    expect(body.instructions).toBe("Focus on liability");
    expect(body.context.jurisdiction).toBe("SG");
  });

  it("propagates job failure error", async () => {
    const jobCreated = { jobId: "r3", pollUrl: "/jobs/r3", status: "queued" };
    const jobFailed = { id: "r3", type: "review", status: "failed", created_at: "2025-01-01", error: "Model overloaded" };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(jobCreated)))
      .mockResolvedValueOnce(new Response(JSON.stringify(jobFailed)));

    await expect(reviewPaid("Text", "token")).rejects.toThrow("Model overloaded");
  });
});

describe("runFullAnalysis", () => {
  it("fires review + research in parallel and returns both", async () => {
    const reviewJob = { jobId: "rev1", pollUrl: "/jobs/rev1", status: "queued" };
    const researchJob = { jobId: "res1", pollUrl: "/jobs/res1", status: "queued" };
    const revCompleted = { id: "rev1", type: "review", status: "completed", created_at: "2025-01-01" };
    const resCompleted = { id: "res1", type: "research", status: "completed", created_at: "2025-01-01" };
    const revResult = { id: "rev1", status: "completed", result: { summary: "Review OK", issues: [] } };
    const resResult = { id: "res1", status: "completed", result: { report: "Research report" } };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/review") && !url.includes("jobs")) return new Response(JSON.stringify(reviewJob));
      if (url.includes("/research") && !url.includes("jobs")) return new Response(JSON.stringify(researchJob));
      if (url.includes("/jobs/rev1/result")) return new Response(JSON.stringify(revResult));
      if (url.includes("/jobs/res1/result")) return new Response(JSON.stringify(resResult));
      if (url.includes("/jobs/rev1")) return new Response(JSON.stringify(revCompleted));
      if (url.includes("/jobs/res1")) return new Response(JSON.stringify(resCompleted));
      return new Response("Not found", { status: 404 });
    });

    const result = await runFullAnalysis("Legal text", "token");
    expect(result.review?.summary).toBe("Review OK");
    expect(result.research?.report).toBe("Research report");
  });

  it("handles research endpoint failure gracefully", async () => {
    const reviewJob = { jobId: "rev2", pollUrl: "/jobs/rev2", status: "queued" };
    const revCompleted = { id: "rev2", type: "review", status: "completed", created_at: "2025-01-01" };
    const revResult = { id: "rev2", status: "completed", result: { summary: "Review only", issues: [] } };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/review") && !url.includes("jobs")) return new Response(JSON.stringify(reviewJob));
      if (url.includes("/research")) return new Response("Not implemented", { status: 501 });
      if (url.includes("/jobs/rev2/result")) return new Response(JSON.stringify(revResult));
      if (url.includes("/jobs/rev2")) return new Response(JSON.stringify(revCompleted));
      return new Response("Not found", { status: 404 });
    });

    const result = await runFullAnalysis("Legal text", "token");
    expect(result.review?.summary).toBe("Review only");
    expect(result.research).toBeUndefined();
  });

  it("can be aborted with AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();

    vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new DOMException("Aborted", "AbortError");
    });

    await expect(
      runFullAnalysis("Legal text", "token", controller.signal),
    ).rejects.toThrow();
  });
});

describe("contract 0.305.0 field pins", () => {
  it("polls using JobCreatedResponse.jobId, not job_id", async () => {
    // A response shaped with only the pre-W0 `job_id` key (no `jobId`) must produce
    // an undefined jobId and therefore poll GET /jobs/undefined — proving reviewPaid
    // reads the contract's camelCase field, not the legacy one.
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ job_id: "legacy-only" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "x", status: "completed" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "x", status: "completed", result: { summary: "ok", issues: [] } })));

    await reviewPaid("Text", "token");

    const pollUrl = vi.mocked(fetch).mock.calls[1]![0] as string;
    expect(pollUrl).toContain("/jobs/undefined");
  });

  it("sends the research body as {question}, not {query}", async () => {
    const reviewJob = { jobId: "rev", pollUrl: "/jobs/rev", status: "queued" };
    const researchJob = { jobId: "res", pollUrl: "/jobs/res", status: "queued" };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/research") && !url.includes("jobs")) {
        const body = JSON.parse(init!.body as string);
        expect(body).toHaveProperty("question");
        expect(body).not.toHaveProperty("query");
        expect(body.question).toContain("Legal text");
        return new Response(JSON.stringify(researchJob));
      }
      if (url.includes("/review") && !url.includes("jobs")) return new Response(JSON.stringify(reviewJob));
      if (url.includes("/jobs/rev")) return new Response(JSON.stringify({ id: "rev", status: "completed", result: { summary: "ok", issues: [] } }));
      if (url.includes("/jobs/res")) return new Response(JSON.stringify({ id: "res", status: "completed", result: { report: "r" } }));
      return new Response("Not found", { status: 404 });
    });

    await runFullAnalysis("Legal text", "token");
  });
});
