// ABOUTME: Tests for jobs API module — list and result fetching.
// ABOUTME: Verifies query param construction and response unwrapping.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { listJobs, getJobResult } from "@/api/jobs";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("listJobs", () => {
  it("fetches jobs list from API", async () => {
    const jobs = [
      { id: "j1", type: "review", status: "completed", created_at: "2025-01-01" },
      { id: "j2", type: "research", status: "running", created_at: "2025-01-02" },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ jobs })),
    );

    const result = await listJobs("token-123");

    expect(result).toEqual(jobs);
    const url = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(url).toContain("/jobs");
    expect(url).not.toContain("?");
  });

  it("adds status filter as query param", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ jobs: [] })),
    );

    await listJobs("token", "completed");

    const url = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(url).toContain("?status=completed");
  });

  it("adds type filter as query param", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ jobs: [] })),
    );

    await listJobs("token", undefined, "review");

    const url = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(url).toContain("?type=review");
  });

  it("adds both status and type as query params", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ jobs: [] })),
    );

    await listJobs("token", "failed", "mammoth");

    const url = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(url).toContain("status=failed");
    expect(url).toContain("type=mammoth");
  });
});

describe("getJobResult", () => {
  it("fetches job result by id", async () => {
    const jobResult = { id: "j1", status: "completed", result: { summary: "Done" } };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(jobResult)),
    );

    const result = await getJobResult("j1", "token-123");

    expect(result).toEqual(jobResult);
    const url = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(url).toContain("/jobs/j1/result");
  });
});
