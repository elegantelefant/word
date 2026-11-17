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

  it("uses the safe generic message for a server error, never its internals (#103)", async () => {
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
      expect((err as ApiError).message).toBe("Something went wrong while contacting Elefant. Please try again.");
      expect((err as ApiError).message).not.toContain("SECRET_INTERNAL_TRACE");
      expect((err as ApiError).message).not.toContain("traceback");
    }
  });

  // Shape of a backend refusal relayed by the Nuxt proxy ([...path].ts createError + error_responses.py);
  // the top-level message copying statusMessage was seen live (curl of elefant.legal/api/v4, 17 Nov).
  const proxyRefusal = (status: number, code: string, message: string, reason: string) =>
    new Response(JSON.stringify({
      error: true,
      url: "https://elefant.legal/api/v4/api/v1/review",
      statusCode: status,
      statusMessage: "backend_error",
      message: "backend_error",
      data: { error: true, upstream_status: status, error_class: "QuotaError", code, message, path: "/api/v1/review", detail: { reason, product: "drafter" } },
    }), { status });

  it.each([
    [429, "QUOTA_EXCEEDED", "You've used up this period's allowance.", "over_plan_quota"],
    [402, "CREDITS_EXHAUSTED", "You're out of credits.", "credits_exhausted"],
    [403, "FORBIDDEN", "This isn't included in your current plan. Upgrade to turn it on.", "feature_disabled"],
  ])("shows the backend's own message and plan reason for a %s refusal, not the proxy's backend_error (#103)", async (status, code, message, reason) => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(proxyRefusal(status, code, message, reason));

    await expect(apiFetch("/review", "token")).rejects.toMatchObject({ status, message, reason });
    expect(logged).toHaveBeenCalledWith("Elefant API request failed", { path: "/review", status });
  });

  // Envelopes the proxy builds itself carry its own diagnostics, which are not for users.
  const proxyOwn = (status: number, code: string, errorClass: string, message: string) =>
    new Response(JSON.stringify({
      error: true, url: "https://elefant.legal/api/v4/api/v1/review", statusCode: status,
      statusMessage: status === 403 ? "Forbidden" : "backend_error", message: status === 403 ? "Forbidden" : "backend_error",
      data: { error: true, upstream_status: status, error_class: errorClass, code, message, path: "/api/v1/review" },
    }), { status });

  it.each([
    [502, "NETWORK_ERROR", "network", "fetch failed"],
    [503, "UPSTREAM_NON_COMPLIANT", "ServerError", "Upstream returned 503 without a structured envelope."],
  ])("keeps the proxy's own %s diagnostics away from the user", async (status, code, errorClass, internal) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(proxyOwn(status, code, errorClass, internal));

    await expect(apiFetch("/review", "token")).rejects.toMatchObject({
      status,
      message: "Something went wrong while contacting Elefant. Please try again.",
      reason: undefined,
    });
  });

  it("shows the proxy's route refusal with no plan reason", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(proxyOwn(403, "ROUTE_NOT_ALLOWED", "AuthError", "This token may not be used on this route."));

    await expect(apiFetch("/draft", "token")).rejects.toMatchObject({
      status: 403,
      message: "This token may not be used on this route.",
      reason: undefined,
    });
  });

  it("says to wait a moment for the edge rate limiter's bare 429", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      error: true, url: "https://elefant.legal/api/v4/api/v1/review", statusCode: 429,
      statusMessage: "Too Many Requests", message: "Too Many Requests",
    }), { status: 429 }));

    await expect(apiFetch("/review", "token")).rejects.toMatchObject({
      status: 429,
      message: "Too many requests. Please wait a moment.",
      reason: undefined,
    });
    expect(logged).toHaveBeenCalledWith("Elefant API request failed", { path: "/review", status: 429 });
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
