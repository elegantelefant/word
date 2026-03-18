// ABOUTME: Tests for polling cancellation via AbortSignal.
// ABOUTME: Verifies abort stops network requests mid-poll and during sleep.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { pollForResult } from "@/lib/polling";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("pollForResult — abort", () => {
  it("stops polling when signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      pollForResult("j1", "token", 5, 10, controller.signal),
    ).rejects.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("stops polling when signal is aborted between attempts", async () => {
    const controller = new AbortController();
    const running = { id: "j1", type: "review", status: "running", created_at: "2025-01-01" };

    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      callCount++;
      if (callCount >= 2) controller.abort();
      return Promise.resolve(new Response(JSON.stringify(running)));
    });

    await expect(
      pollForResult("j1", "token", 60, 1, controller.signal),
    ).rejects.toThrow();

    // Should have stopped after just a few calls
    expect(callCount).toBeLessThanOrEqual(3);
  });

  it("completes normally if signal is never aborted", async () => {
    const controller = new AbortController();
    const completed = { id: "j1", type: "review", status: "completed", created_at: "2025-01-01" };
    const result = { id: "j1", status: "completed", result: { summary: "OK" } };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(completed)))
      .mockResolvedValueOnce(new Response(JSON.stringify(result)));

    const res = await pollForResult("j1", "token", 5, 10, controller.signal);
    expect(res.result).toEqual({ summary: "OK" });
  });
});
