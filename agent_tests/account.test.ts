// ABOUTME: Tests for api/account — getMe API call.
// ABOUTME: Verifies correct endpoint and response parsing.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMe } from "@/api/account";

beforeEach(() => {
  vi.restoreAllMocks();
});

const ME_RESPONSE = {
  user: { id: "u1", email: "a@b.com", name: "Alice" },
  org: { id: "o1", name: "LegalCo", slug: "legalco", accountType: "pro" },
};

describe("getMe", () => {
  it("calls /me with auth token", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(ME_RESPONSE)));

    const result = await getMe("tok-123");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/me"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok-123" }),
      }),
    );
    expect(result.user.id).toBe("u1");
    expect(result.org.accountType).toBe("pro");
  });
});
