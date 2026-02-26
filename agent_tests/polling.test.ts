// ABOUTME: Tests for the job polling utility.
// ABOUTME: Verifies poll loop, completion detection, and timeout/failure handling.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { pollForResult } from "@/lib/polling";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("pollForResult", () => {
  it("returns result when job completes", async () => {
    const jobResponse = { id: "j1", type: "review", status: "completed", created_at: "2025-01-01" };
    const resultResponse = { id: "j1", status: "completed", result: { summary: "All good" } };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(jobResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(resultResponse)));

    const result = await pollForResult("j1", "token", 5, 10);
    expect(result.result).toEqual({ summary: "All good" });
  });

  it("polls multiple times before completion", async () => {
    const running = { id: "j1", type: "review", status: "running", created_at: "2025-01-01" };
    const completed = { id: "j1", type: "review", status: "completed", created_at: "2025-01-01" };
    const resultResponse = { id: "j1", status: "completed", result: { summary: "Done" } };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(running)))
      .mockResolvedValueOnce(new Response(JSON.stringify(running)))
      .mockResolvedValueOnce(new Response(JSON.stringify(completed)))
      .mockResolvedValueOnce(new Response(JSON.stringify(resultResponse)));

    const result = await pollForResult("j1", "token", 5, 10);
    expect(result.result).toEqual({ summary: "Done" });
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("throws on job failure", async () => {
    const failed = { id: "j1", type: "review", status: "failed", created_at: "2025-01-01", error: "Boom" };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify(failed)));

    await expect(pollForResult("j1", "token", 5, 10)).rejects.toThrow("Boom");
  });

  it("throws on timeout", async () => {
    const running = { id: "j1", type: "review", status: "running", created_at: "2025-01-01" };

    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => Promise.resolve(new Response(JSON.stringify(running))),
    );

    await expect(pollForResult("j1", "token", 2, 10)).rejects.toThrow("Job timed out");
  });
});
