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

  it("uses a safe message for a non-JSON error body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Server Error", { status: 502 }),
    );

    try {
      await apiFetch("/test", "token");
      expect.fail("Should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toBe(
        "Something went wrong while contacting Elefant. Please try again.",
      );
    }
  });

  it("uses a meaningful message from a JSON 4xx error response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: true,
          upstream_status: 400,
          error_class: "ClientError",
          code: "BAD_REQUEST",
          message: "This document type is not supported.",
          path: "/api/v4/test",
          request_id: "req-test",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(apiFetch("/test", "token")).rejects.toMatchObject({
      status: 400,
      message: "This document type is not supported.",
    });
  });

  it("uses a meaningful message from a JSON error response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: true,
          upstream_status: 500,
          error_class: "ServerError",
          code: "INTERNAL_ERROR",
          message: "Internal server error",
          detail: {
            traceback: ["SECRET_INTERNAL_TRACE"],
          },
          path: "/api/v4/test",
          request_id: "req-test",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    try {
      await apiFetch("/test", "token");
      expect.fail("Should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(500);
      expect((err as ApiError).message).toBe("Internal server error");
      expect((err as ApiError).message).not.toContain("SECRET_INTERNAL_TRACE");
      expect((err as ApiError).message).not.toContain("traceback");
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
