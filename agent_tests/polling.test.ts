// ABOUTME: Tests for the job polling utility.
// ABOUTME: Verifies poll loop, completion detection, and timeout/failure handling.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError, NetworkError } from "@/api/client";
import { pollForResult } from "@/lib/polling";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("pollForResult", () => {
  it("returns result when job completes", async () => {
    const jobResponse = { id: "j1", type: "review", status: "completed", createdAt: "2025-01-01" };
    const resultResponse = { id: "j1", status: "completed", result: { summary: "All good" } };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(jobResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(resultResponse)));

    const result = await pollForResult("j1", "token", 5, 10);
    expect(result.result).toEqual({ summary: "All good" });
  });

  it("polls multiple times before completion", async () => {
    const running = { id: "j1", type: "review", status: "running", createdAt: "2025-01-01" };
    const completed = { id: "j1", type: "review", status: "completed", createdAt: "2025-01-01" };
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
    const failed = { id: "j1", type: "review", status: "failed", createdAt: "2025-01-01", error: "Boom" };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify(failed)));

    await expect(pollForResult("j1", "token", 5, 10)).rejects.toThrow("Boom");
  });

  it("throws on timeout", async () => {
    const running = { id: "j1", type: "review", status: "running", createdAt: "2025-01-01" };

    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => Promise.resolve(new Response(JSON.stringify(running))),
    );

    await expect(pollForResult("j1", "token", 2, 10)).rejects.toThrow("Job timed out");
  });
});


describe("pollForResult transient errors", () => {
  const completed = { id: "j1", status: "completed" };
  const result = { id: "j1", status: "completed", result: { summary: "Recovered" } };

  it("survives two blips then succeeds", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Offline"))
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(completed)))
      .mockResolvedValueOnce(new Response(JSON.stringify(result)));

    await expect(pollForResult("j1", "token", 6, 1)).resolves.toEqual(result);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it.each(["network", "server"])("throws after three consecutive %s errors", async (kind) => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      if (kind === "network") throw new TypeError("Offline");
      return new Response("Unavailable", { status: 503 });
    });

    await expect(pollForResult("j1", "token", 6, 1)).rejects.toBeInstanceOf(
      kind === "network" ? NetworkError : ApiError,
    );
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("resets consecutive errors after a good poll", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Offline"))
      .mockRejectedValueOnce(new TypeError("Offline"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "j1", status: "running" })))
      .mockRejectedValueOnce(new TypeError("Offline again"))
      .mockRejectedValueOnce(new TypeError("Offline again"))
      .mockResolvedValueOnce(new Response(JSON.stringify(completed)))
      .mockResolvedValueOnce(new Response(JSON.stringify(result)));

    await expect(pollForResult("j1", "token", 8, 1)).resolves.toEqual(result);
    expect(fetch).toHaveBeenCalledTimes(7);
  });

  it.each([401, 429])("throws on the first %s response", async (status) => {
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("Rejected", { status }));

    await expect(pollForResult("j1", "token", 6, 1)).rejects.toMatchObject({ status });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("throws immediately when a poll is aborted", async () => {
    const error = new DOMException("Aborted", "AbortError");
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(error);

    await expect(pollForResult("j1", "token", 6, 1)).rejects.toBe(error);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
