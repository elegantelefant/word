// ABOUTME: Tests for useJob hook state transitions.
// ABOUTME: Verifies idle→polling→completed/failed flow.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useJob } from "@/hooks/useJob";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useJob", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useJob());
    expect(result.current.state).toBe("idle");
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("transitions to completed on successful poll", async () => {
    const jobStatus = { id: "j1", type: "review", status: "completed", created_at: "2025-01-01" };
    const jobResult = { id: "j1", status: "completed", result: { summary: "Good" } };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(jobStatus)))
      .mockResolvedValueOnce(new Response(JSON.stringify(jobResult)));

    const { result } = renderHook(() => useJob());

    await act(async () => {
      await result.current.poll("j1", "token");
    });

    expect(result.current.state).toBe("completed");
    expect(result.current.result).toEqual(jobResult);
    expect(result.current.error).toBeNull();
  });

  it("transitions to failed on poll error", async () => {
    const failed = { id: "j1", type: "review", status: "failed", created_at: "2025-01-01", error: "Boom" };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(failed)));

    const { result } = renderHook(() => useJob());

    await act(async () => {
      try {
        await result.current.poll("j1", "token");
      } catch {
        // expected
      }
    });

    expect(result.current.state).toBe("failed");
    expect(result.current.error).toBe("Boom");
  });

  it("resets to idle state", async () => {
    const jobStatus = { id: "j1", type: "review", status: "completed", created_at: "2025-01-01" };
    const jobResult = { id: "j1", status: "completed", result: { summary: "Good" } };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(jobStatus)))
      .mockResolvedValueOnce(new Response(JSON.stringify(jobResult)));

    const { result } = renderHook(() => useJob());

    await act(async () => {
      await result.current.poll("j1", "token");
    });

    expect(result.current.state).toBe("completed");

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
