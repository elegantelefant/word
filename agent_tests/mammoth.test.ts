// ABOUTME: Tests for api/mammoth — legal request creation and listing.
// ABOUTME: Pins the contract's requestType field name (LegalRequestCreateRequest).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLegalRequest, listLegalRequests } from "@/api/mammoth";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("createLegalRequest", () => {
  it("sends the create body as {requestType}, not {request_type}", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({
        id: "r1",
        requestType: "review",
        status: "pending",
        priority: "normal",
        title: "Review NDA",
      })),
    );

    await createLegalRequest({ requestType: "review", title: "Review NDA" }, "token");

    const call = vi.mocked(fetch).mock.calls[0]!;
    const body = JSON.parse(call[1]!.body as string);
    expect(body).toHaveProperty("requestType", "review");
    expect(body).not.toHaveProperty("request_type");
  });
});

describe("listLegalRequests", () => {
  it("reads requestType (camelCase) off each response item", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({
        requests: [
          { id: "r1", requestType: "research", status: "pending", priority: "low", title: "Research" },
        ],
        total: 1,
      })),
    );

    const result = await listLegalRequests("token");

    expect(result[0]!.requestType).toBe("research");
  });
});
