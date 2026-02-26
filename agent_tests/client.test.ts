// ABOUTME: Tests for the base API fetch client.
// ABOUTME: Verifies auth headers, error handling, and request formatting.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch, ApiError } from "@/api/client";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("sends GET request with auth header", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ user_id: "123" }), { status: 200 }),
    );

    const result = await apiFetch<{ user_id: string }>("/whoami", "test-token");

    expect(result.user_id).toBe("123");
    const call = vi.mocked(fetch).mock.calls[0]!;
    expect(call[0]).toContain("/whoami");
    expect(call[1]!.method).toBe("GET");
    expect((call[1]!.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-token");
  });

  it("sends POST with JSON body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ job_id: "abc" }), { status: 200 }),
    );

    await apiFetch("/review", "token", {
      method: "POST",
      body: { text: "hello" },
    });

    const call = vi.mocked(fetch).mock.calls[0]!;
    expect(call[1]!.method).toBe("POST");
    expect(JSON.parse(call[1]!.body as string)).toEqual({ text: "hello" });
  });

  it("throws ApiError on non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Not found", { status: 404 }),
    );

    try {
      await apiFetch("/missing", "token");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });
});
