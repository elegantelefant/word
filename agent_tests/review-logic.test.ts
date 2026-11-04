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
    const jobCompleted = { id: "r1", type: "review", status: "completed", createdAt: "2025-01-01" };
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
    const jobCompleted = { id: "r2", type: "review", status: "completed", createdAt: "2025-01-01" };
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
    const jobFailed = { id: "r3", type: "review", status: "failed", createdAt: "2025-01-01", error: "Model overloaded" };

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
    const revCompleted = { id: "rev1", type: "review", status: "completed", createdAt: "2025-01-01" };
    const resCompleted = { id: "res1", type: "research", status: "completed", createdAt: "2025-01-01" };
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
    const researchCall = vi.mocked(fetch).mock.calls.find(([url]) => String(url).endsWith("/research"))!;
    expect(JSON.parse(researchCall[1]!.body as string)).toEqual({
      question: "Analyze the following legal text and identify all legal risks, obligations, and key terms:\n\nLegal text",
    });
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(urls).toContain("https://elefant.legal/api/v4/api/v1/jobs/rev1/result");
    expect(urls).toContain("https://elefant.legal/api/v4/api/v1/jobs/res1/result");
  });

  it("handles research endpoint failure gracefully", async () => {
    const reviewJob = { jobId: "rev2", pollUrl: "/jobs/rev2", status: "queued" };
    const revCompleted = { id: "rev2", type: "review", status: "completed", createdAt: "2025-01-01" };
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


describe("runFullAnalysis partial results", () => {
  it.each(["create", "poll"])("returns research when review rejects during %s", async (stage) => {
    const research = { report: "Completed paid research" };
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;
      if (!path.includes("/jobs/") && path.endsWith("/review")) {
        if (stage === "create") throw new TypeError("Review unavailable");
        return new Response(JSON.stringify({ jobId: "review" }));
      }
      if (!path.includes("/jobs/") && path.endsWith("/research")) return new Response(JSON.stringify({ jobId: "research" }));
      if (path.endsWith("/jobs/review")) {
        return new Response(JSON.stringify({ status: "failed", error: "Review failed" }));
      }
      if (path.endsWith("/jobs/research")) return new Response(JSON.stringify({ status: "completed" }));
      if (path.endsWith("/jobs/research/result")) return new Response(JSON.stringify({ result: research }));
      throw new Error(`Unexpected request: ${path}`);
    });

    await expect(runFullAnalysis("Legal text", "token")).resolves.toEqual({ research });
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith("/jobs/research/result"))).toBe(true);
  });

  it("returns review when research polling fails", async () => {
    const review = { summary: "Completed paid review", issues: [] };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;
      if (!path.includes("/jobs/") && path.endsWith("/review")) return new Response(JSON.stringify({ jobId: "review" }));
      if (!path.includes("/jobs/") && path.endsWith("/research")) return new Response(JSON.stringify({ jobId: "research" }));
      if (path.endsWith("/jobs/research")) return new Response(JSON.stringify({ status: "failed", error: "Research failed" }));
      if (path.endsWith("/jobs/review")) return new Response(JSON.stringify({ status: "completed" }));
      if (path.endsWith("/jobs/review/result")) return new Response(JSON.stringify({ result: review }));
      throw new Error(`Unexpected request: ${path}`);
    });

    await expect(runFullAnalysis("Legal text", "token")).resolves.toEqual({ review });
  });

  it.each(["create", "poll"])("throws the review error when both jobs fail during %s", async (stage) => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;
      const kind = path.endsWith("/review") ? "review" : "research";
      if (!path.includes("/jobs/") && stage === "poll") {
        return new Response(JSON.stringify({ jobId: kind }));
      }
      if (stage === "create") {
        return new Response(JSON.stringify({ message: `${kind} create failed` }), { status: 400 });
      }
      return new Response(JSON.stringify({ status: "failed", error: `${kind} poll failed` }));
    });

    await expect(runFullAnalysis("Legal text", "token")).rejects.toThrow(`review ${stage} failed`);
  });
});

describe("job result validation", () => {
  function completedJobs(review: unknown, research: unknown) {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;
      if (!path.includes("/jobs/")) {
        return new Response(JSON.stringify({ jobId: path.endsWith("/review") ? "review" : "research" }));
      }
      if (path.endsWith("/result")) {
        return new Response(JSON.stringify({ result: path.endsWith("/review/result") ? review : research }));
      }
      return new Response(JSON.stringify({ status: "completed" }));
    });
  }

  it.each([
    { issues: [] },
    { summary: 42 },
    { summary: "Review", issues: "invalid" },
    { summary: "Review", issues: [{ severity: 42 }] },
  ])("refuses a malformed review result at the boundary: %j", async (payload) => {
    completedJobs(payload, { report: "Research report" });
    await expect(reviewPaid("Text", "token")).rejects.toThrow("Invalid review job result");
    await expect(runFullAnalysis("Text", "token")).resolves.toEqual({ research: { report: "Research report" } });
    completedJobs(payload, undefined);
    await expect(runFullAnalysis("Text", "token")).rejects.toThrow("Invalid review job result");
  });

  it("passes through contract-shaped issues and unknown fields in both review paths", async () => {
    const review = {
      jobType: "review",
      summary: "Contract review",
      futureField: { value: true },
      issues: [
        {},
        {
          title: "Termination", category: "custom category", severity: "high",
          recommendation: "amend", clauseReference: "3.1", sourceFilename: "contract.docx",
          description: "Unclear notice period", explanation: "No deadline",
          targetQuote: null, replacement: null, futureIssueField: "preserved",
        },
      ],
    };
    const research = { jobType: "research", report: "Research", futureField: true };
    completedJobs(review, research);
    await expect(reviewPaid("Text", "token")).resolves.toEqual(review);
    await expect(runFullAnalysis("Text", "token")).resolves.toEqual({ review, research });
  });

  it("accepts a review with optional issues omitted", async () => {
    const review = { summary: "No issues field" };
    completedJobs(review, { report: "Research report" });
    await expect(reviewPaid("Text", "token")).resolves.toEqual(review);
    await expect(runFullAnalysis("Text", "token")).resolves.toMatchObject({ review });
  });

  it.each([undefined, null])("handles a missing result the same in both review paths: %j", async (payload) => {
    completedJobs(payload, { report: "Research report" });
    await expect(reviewPaid("Text", "token")).rejects.toThrow("Invalid review job result");
    await expect(runFullAnalysis("Text", "token")).resolves.toEqual({ research: { report: "Research report" } });
    completedJobs(payload, undefined);
    await expect(runFullAnalysis("Text", "token")).rejects.toThrow("Invalid review job result");
  });

  it.each([undefined, null, {}, { report: 42 }])("preserves review when the research result is missing or malformed: %j", async (payload) => {
    completedJobs({ summary: "Valid review" }, payload);
    await expect(runFullAnalysis("Text", "token")).resolves.toEqual({ review: { summary: "Valid review" } });
  });
});
