// ABOUTME: Tests for auth logic — token persistence, tier detection, login/logout state machine.
// ABOUTME: Uses fake fetch responses instead of mocking auth module internals.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuthProvider } from "@/hooks/useAuth";
import { getSavedToken, saveToken, clearToken } from "@/api/auth";

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("token persistence", () => {
  it("saveToken + getSavedToken round-trips", () => {
    expect(getSavedToken()).toBeNull();
    saveToken("abc123");
    expect(getSavedToken()).toBe("abc123");
  });

  it("clearToken removes the saved token", () => {
    saveToken("abc123");
    clearToken();
    expect(getSavedToken()).toBeNull();
  });

  it("getSavedToken handles corrupt localStorage gracefully", () => {
    // Direct write to avoid saveToken's JSON encoding
    localStorage.setItem("elefant_token", "not-a-token");
    // Should return the raw value — it's just a string key
    expect(getSavedToken()).toBe("not-a-token");
  });
});

describe("useAuthProvider — state machine", () => {
  it("starts as free tier with no token", () => {
    const { result } = renderHook(() => useAuthProvider());
    expect(result.current.tier).toBe("free");
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it("loads saved token and upgrades to paid on valid /me response", async () => {
    saveToken("valid-token");

    const meResponse = {
      user: { id: "u1", email: "test@test.com", name: "Test User" },
      org: { id: "o1", name: "Test Org", slug: "test", accountType: "professional" },
      entitlements: {},
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(meResponse)),
    );

    const { result } = renderHook(() => useAuthProvider());

    // Wait for the useEffect to fire and loadUser to complete
    await vi.waitFor(() => {
      expect(result.current.tier).toBe("paid");
    });

    expect(result.current.token).toBe("valid-token");
    expect(result.current.user?.user.name).toBe("Test User");
  });

  it("clears token and stays free when /me returns 401", async () => {
    saveToken("expired-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );

    const { result } = renderHook(() => useAuthProvider());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tier).toBe("free");
    expect(result.current.token).toBeNull();
    expect(getSavedToken()).toBeNull();
  });

  it("detects free accountType correctly", async () => {
    saveToken("free-token");

    const meResponse = {
      user: { id: "u1", email: "test@test.com", name: "Free User" },
      org: { id: "o1", name: "Free Org", slug: "free", accountType: "free" },
      entitlements: {},
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(meResponse)),
    );

    const { result } = renderHook(() => useAuthProvider());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tier).toBe("free");
  });

  it("detects trial accountType as free", async () => {
    saveToken("trial-token");

    const meResponse = {
      user: { id: "u1", email: "test@test.com", name: "Trial User" },
      org: { id: "o1", name: "Trial Org", slug: "trial", accountType: "trial" },
      entitlements: {},
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(meResponse)),
    );

    const { result } = renderHook(() => useAuthProvider());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tier).toBe("free");
  });

  it("pins tier detection to the camelCase org.accountType field (contract 0.305.0)", async () => {
    saveToken("legacy-shape-token");

    // A snake_case account_type — the pre-W0 field name — must NOT be read as tier
    // signal. Contract's MeOrg only has accountType; a server sending the old shape
    // (or this add-in regressing to read the old field) should fall through to "paid",
    // not be silently treated as free.
    const legacyShapedResponse = {
      user: { id: "u1", email: "test@test.com", name: "Legacy Shape User" },
      org: { id: "o1", name: "Org", slug: "org", account_type: "free" },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(legacyShapedResponse)),
    );

    const { result } = renderHook(() => useAuthProvider());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tier).toBe("paid");
  });

  it("logout clears state and token", async () => {
    saveToken("valid-token");

    const meResponse = {
      user: { id: "u1", email: "test@test.com", name: "Test User" },
      org: { id: "o1", name: "Test Org", slug: "test", accountType: "enterprise" },
      entitlements: {},
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(meResponse)),
    );

    const { result } = renderHook(() => useAuthProvider());

    await vi.waitFor(() => {
      expect(result.current.tier).toBe("paid");
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.tier).toBe("free");
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(getSavedToken()).toBeNull();
  });

  it("login with token directly loads user", async () => {
    const meResponse = {
      user: { id: "u1", email: "test@test.com", name: "Direct Login" },
      org: { id: "o1", name: "Org", slug: "org", accountType: "professional" },
      entitlements: {},
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(meResponse)),
    );

    const { result } = renderHook(() => useAuthProvider());

    await act(async () => {
      await result.current.login("direct-token");
    });

    expect(result.current.tier).toBe("paid");
    expect(result.current.token).toBe("direct-token");
    expect(getSavedToken()).toBe("direct-token");
  });
});
