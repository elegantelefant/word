// ABOUTME: Tests for review API logic — paid path polling, full analysis orchestration.
// ABOUTME: Uses fake fetch responses to test the real orchestration code.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { reviewPaid, runFullAnalysis } from "@/api/review";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("reviewPaid", () => {
  it("creates job then polls to completion", async () => {
    const jobCreated = { job_id: "r1", poll_url: "/jobs/r1", status: "queued" };
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
    const jobCreated = { job_id: "r2", poll_url: "/jobs/r2", status: "queued" };
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
    const jobCreated = { job_id: "r3", poll_url: "/jobs/r3", status: "queued" };
    const jobFailed = { id: "r3", type: "review", status: "failed", created_at: "2025-01-01", error: "Model overloaded" };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(jobCreated)))
      .mockResolvedValueOnce(new Response(JSON.stringify(jobFailed)));

    await expect(reviewPaid("Text", "token")).rejects.toThrow("Model overloaded");
  });
});

describe("runFullAnalysis", () => {
  it("fires review + research in parallel and returns both", async () => {
    const reviewJob = { job_id: "rev1", poll_url: "/jobs/rev1", status: "queued" };
    const researchJob = { job_id: "res1", poll_url: "/jobs/res1", status: "queued" };
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
    const reviewJob = { job_id: "rev2", poll_url: "/jobs/rev2", status: "queued" };
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
