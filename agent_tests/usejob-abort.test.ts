// ABOUTME: Tests for useJob hook abort/cancellation behavior.
// ABOUTME: Verifies that reset() actually cancels in-flight polling.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useJob } from "@/hooks/useJob";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useJob — abort behavior", () => {
  it("reset cancels in-flight poll via AbortController", async () => {
    const running = { id: "j1", type: "review", status: "running", created_at: "2025-01-01" };

    let fetchCount = 0;
    let lastSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, opts) => {
      fetchCount++;
      lastSignal = opts?.signal as AbortSignal | undefined;
      return Promise.resolve(new Response(JSON.stringify(running)));
    });

    const { result } = renderHook(() => useJob());

    // Start polling (don't await — we'll reset mid-flight)
    act(() => {
      result.current.poll("j1", "token").catch(() => {});
    });

    // Wait for first fetch to fire
    await vi.waitFor(() => expect(fetchCount).toBeGreaterThan(0));

    // Reset should abort the signal and reset state
    act(() => {
      result.current.reset();
    });

    expect(lastSignal?.aborted).toBe(true);
    expect(result.current.state).toBe("idle");
    expect(result.current.result).toBeNull();
  });

  it("starting a new poll cancels the previous one", async () => {
    const running = { id: "j1", type: "review", status: "running", created_at: "2025-01-01" };
    const completed = { id: "j2", type: "review", status: "completed", created_at: "2025-01-01" };
    const resultJ2 = { id: "j2", status: "completed", result: { summary: "Job 2" } };

    let firstSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, opts) => {
      const url = String(input);
      const signal = opts?.signal as AbortSignal | undefined;
      if (url.includes("j1") && !firstSignal) firstSignal = signal;
      if (url.includes("j2") && url.includes("/result")) return new Response(JSON.stringify(resultJ2));
      if (url.includes("j2")) return new Response(JSON.stringify(completed));
      return new Response(JSON.stringify(running));
    });

    const { result } = renderHook(() => useJob());

    // Start polling job 1
    act(() => {
      result.current.poll("j1", "token").catch(() => {});
    });

    // Wait for job 1's first fetch
    await vi.waitFor(() => expect(firstSignal).toBeDefined());

    // Start polling job 2 — should cancel job 1
    await act(async () => {
      await result.current.poll("j2", "token");
    });

    expect(firstSignal?.aborted).toBe(true);
    expect(result.current.state).toBe("completed");
    expect(result.current.result?.result).toEqual({ summary: "Job 2" });
  });
});
