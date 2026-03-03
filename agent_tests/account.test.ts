// ABOUTME: Tests for api/account — getMe and whoami API calls.
// ABOUTME: Verifies correct endpoints and response parsing.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMe, whoami } from "@/api/account";

beforeEach(() => {
  vi.restoreAllMocks();
});

const ME_RESPONSE = {
  user: { id: "u1", email: "a@b.com", name: "Alice" },
  org: { id: "o1", name: "LegalCo", slug: "legalco", account_type: "pro" },
  entitlements: ["review"],
};

const WHOAMI_RESPONSE = {
  user_id: "u1",
  email: "a@b.com",
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
    expect(result.org.account_type).toBe("pro");
  });
});

describe("whoami", () => {
  it("calls /whoami with auth token", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(WHOAMI_RESPONSE)));

    const result = await whoami("tok-456");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/whoami"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok-456" }),
      }),
    );
    expect(result.user_id).toBe("u1");
  });
});
