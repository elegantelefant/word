// ABOUTME: Tests for the base API fetch client.
// ABOUTME: Verifies auth headers, error handling, network errors, and token expiry.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch, ApiError, NetworkError } from "@/api/client";

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

  it("throws ApiError with session expired message on 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );

    try {
      await apiFetch("/me", "expired-token");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(401);
      expect((err as ApiError).isAuthError).toBe(true);
      expect((err as ApiError).message).toContain("Session expired");
    }
  });

  it("throws ApiError with rate limit message on 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Rate limited", { status: 429 }),
    );

    try {
      await apiFetch("/review", "token");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).isRateLimited).toBe(true);
    }
  });

  it("throws NetworkError on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));

    try {
      await apiFetch("/me", "token");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(NetworkError);
      expect((err as NetworkError).message).toContain("Network request failed");
    }
  });

  it("re-throws AbortError without wrapping", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(abort);

    try {
      await apiFetch("/me", "token");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBe(abort);
    }
  });
  it("does not expose raw response bodies for unexpected API errors", async () => {
    const internalDetails =
      "SECRET_INTERNAL_DETAIL: DatabaseError at /app/database.ts:82";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(internalDetails, {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    try {
      await apiFetch("/review", "token");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(500);
      expect((err as ApiError).message).not.toContain(internalDetails);
    }
  });

  it("converts invalid JSON in a successful response into an ApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html>Proxy error</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    try {
      await apiFetch("/review", "token");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(200);
      expect((err as ApiError).message).not.toContain("Proxy error");
    }
  });
});
