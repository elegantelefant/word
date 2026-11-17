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
      org: { id: "o1", name: "Test Org", slug: "test", accountType: "commercial" },
      entitlements: { source: "none", plan: "pro", expiresAt: null },
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

  // Real /me (monorepo me.py): accountType is the org's profile, plan the per-seat plan name,
  // source "none" for subscriptions; a guest session answers anonymous: true with no org.
  const realMe = (accountType: string | null, plan: string | null, extra: Record<string, unknown> = {}) => ({
    user: { id: "u1", email: "test@test.com", name: "Test User" },
    org: accountType === null ? null : { id: "o1", name: "Org", slug: "org", accountType },
    entitlements: { source: "none", plan, expiresAt: null },
    ...extra,
  });

  async function tierFor(me: unknown) {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify(me)));
    const { result, unmount } = renderHook(() => useAuthProvider());
    await act(async () => { await result.current.login("valid-token"); });
    const tier = result.current.tier;
    unmount();
    clearToken();
    return tier;
  }

  it.each([
    ["individual", "lite"], ["explorer", "explorer"], ["commercial", "pro"], ["business", "business"],
    ["enterprise", "enterprise"], ["api", "api"], ["educational", "academia"], ["personal", "personal"],
  ])("a signed-in account on profile %s (plan %s) uses Elefant (owner, 17 Nov: Lite opens Elefant mode)", async (accountType, plan) => {
    expect(await tierFor(realMe(accountType, plan))).toBe("paid");
  });

  it("a signed-in account whose /me has no plan yet still uses Elefant", async () => {
    expect(await tierFor(realMe("individual", null))).toBe("paid");
  });

  it("a member of a paying org on a Lite seat uses Elefant, with Lite's own limits", async () => {
    expect(await tierFor(realMe("business", "lite"))).toBe("paid");
  });

  it("an anonymous (guest) session stays on own-key mode", async () => {
    expect(await tierFor(realMe(null, null, { anonymous: true }))).toBe("free");
  });

  it("logout clears state and token", async () => {
    saveToken("valid-token");

    const meResponse = {
      user: { id: "u1", email: "test@test.com", name: "Test User" },
      org: { id: "o1", name: "Test Org", slug: "test", accountType: "commercial" },
      entitlements: { source: "none", plan: "pro", expiresAt: null },
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
      org: { id: "o1", name: "Org", slug: "org", accountType: "commercial" },
      entitlements: { source: "none", plan: "pro", expiresAt: null },
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
