// ABOUTME: Tests for API client logic — Content-Type, signal forwarding, error chains.
// ABOUTME: Verifies the client correctly builds requests and propagates errors.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch, ApiError, NetworkError } from "@/api/client";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch — request construction", () => {
  it("does not set Content-Type on GET requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({})),
    );

    await apiFetch("/test", "token");

    const headers = vi.mocked(fetch).mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("sets Content-Type on POST requests with body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({})),
    );

    await apiFetch("/test", "token", { method: "POST", body: { key: "val" } });

    const headers = vi.mocked(fetch).mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("forwards AbortSignal to fetch", async () => {
    const controller = new AbortController();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({})),
    );

    await apiFetch("/test", "token", { signal: controller.signal });

    const opts = vi.mocked(fetch).mock.calls[0]![1]!;
    expect(opts.signal).toBe(controller.signal);
  });

  it("allows custom headers alongside auth", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({})),
    );

    await apiFetch("/test", "token", { headers: { "X-Custom": "value" } });

    const headers = vi.mocked(fetch).mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer token");
    expect(headers["X-Custom"]).toBe("value");
  });

  it("custom headers override defaults", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({})),
    );

    await apiFetch("/test", "token", {
      method: "POST",
      body: { x: 1 },
      headers: { "Content-Type": "text/plain" },
    });

    const headers = vi.mocked(fetch).mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("text/plain");
  });
});

describe("apiFetch — error semantics", () => {
  it("ApiError.isAuthError is false for non-401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Forbidden", { status: 403 }),
    );

    try {
      await apiFetch("/test", "token");
      expect.fail("Should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).isAuthError).toBe(false);
      expect((err as ApiError).isRateLimited).toBe(false);
    }
  });

  it("uses statusText when response body is unreadable", async () => {
    const res = new Response(null, { status: 502, statusText: "Bad Gateway" });
    vi.spyOn(res, "text").mockRejectedValueOnce(new Error("body stream already read"));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(res);

    try {
      await apiFetch("/test", "token");
      expect.fail("Should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toBe("Bad Gateway");
    }
  });

  it("NetworkError wraps non-abort fetch failures", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("DNS failure"));

    try {
      await apiFetch("/test", "token");
      expect.fail("Should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(NetworkError);
    }
  });

  it("AbortError is not wrapped in NetworkError", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(abortError);

    try {
      await apiFetch("/test", "token");
      expect.fail("Should throw");
    } catch (err) {
      expect(err).not.toBeInstanceOf(NetworkError);
      expect(err).toBe(abortError);
    }
  });
});
