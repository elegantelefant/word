// ABOUTME: Tests for useAuthProvider hook — login, logout, tier detection, saved token.
// ABOUTME: Mocks api/account and api/auth to isolate hook state transitions.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuthProvider } from "@/hooks/useAuth";

vi.mock("@/api/account", () => ({
  getMe: vi.fn(),
}));

vi.mock("@/api/auth", () => ({
  getSavedToken: vi.fn(() => null),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
  openLoginDialog: vi.fn(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

const PAID_ME = {
  user: { id: "u1", email: "a@b.com", name: "Alice" },
  org: { id: "o1", name: "LegalCo", slug: "legalco", account_type: "pro" },
  entitlements: ["review", "clauses"],
};

const FREE_ME = {
  user: { id: "u2", email: "b@b.com", name: "Bob" },
  org: { id: "o2", name: "FreeCo", slug: "freeco", account_type: "free" },
  entitlements: [],
};

describe("useAuthProvider", () => {
  it("starts in initial state when no saved token", () => {
    const { result } = renderHook(() => useAuthProvider());
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.tier).toBe("free");
  });

  it("starts not-loading when there is no saved token", () => {
    const { result } = renderHook(() => useAuthProvider());
    expect(result.current.loading).toBe(false);
  });

  it("starts in a loading state when a saved token exists", async () => {
    const { getSavedToken } = await import("@/api/auth");
    const { getMe } = await import("@/api/account");
    vi.mocked(getSavedToken).mockReturnValue("saved-tok");
    // Never resolves, so we can observe the initial render rather than the
    // state after loadUser settles.
    vi.mocked(getMe).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuthProvider());
    expect(result.current.loading).toBe(true);
  });

  it("loads saved token on mount", async () => {
    const { getSavedToken } = await import("@/api/auth");
    const { getMe } = await import("@/api/account");
    vi.mocked(getSavedToken).mockReturnValue("saved-tok");
    vi.mocked(getMe).mockResolvedValue(PAID_ME);

    const { result } = renderHook(() => useAuthProvider());

    // Wait for async loadUser to complete
    await vi.waitFor(() => {
      expect(result.current.token).toBe("saved-tok");
    });
    expect(result.current.user).toEqual(PAID_ME);
    expect(result.current.tier).toBe("paid");
  });

  it("detects free tier from account_type", async () => {
    const { getMe } = await import("@/api/account");
    vi.mocked(getMe).mockResolvedValue(FREE_ME);

    const { result } = renderHook(() => useAuthProvider());

    await act(async () => {
      await result.current.login("free-tok");
    });

    expect(result.current.tier).toBe("free");
    expect(result.current.user).toEqual(FREE_ME);
  });

  it("detects trial as free tier", async () => {
    const trialMe = {
      ...PAID_ME,
      org: { ...PAID_ME.org, account_type: "trial" },
    };
    const { getMe } = await import("@/api/account");
    vi.mocked(getMe).mockResolvedValue(trialMe);

    const { result } = renderHook(() => useAuthProvider());

    await act(async () => {
      await result.current.login("trial-tok");
    });

    expect(result.current.tier).toBe("free");
  });

  it("login with token saves and loads user", async () => {
    const { getMe } = await import("@/api/account");
    const { saveToken } = await import("@/api/auth");
    vi.mocked(getMe).mockResolvedValue(PAID_ME);

    const { result } = renderHook(() => useAuthProvider());

    await act(async () => {
      await result.current.login("my-tok");
    });

    expect(saveToken).toHaveBeenCalledWith("my-tok");
    expect(result.current.token).toBe("my-tok");
    expect(result.current.user).toEqual(PAID_ME);
  });

  it("login without token opens dialog", async () => {
    const { getMe } = await import("@/api/account");
    const { openLoginDialog } = await import("@/api/auth");
    vi.mocked(openLoginDialog).mockResolvedValue("dialog-tok");
    vi.mocked(getMe).mockResolvedValue(PAID_ME);

    const { result } = renderHook(() => useAuthProvider());

    await act(async () => {
      await result.current.login();
    });

    expect(openLoginDialog).toHaveBeenCalled();
    expect(result.current.token).toBe("dialog-tok");
  });

  it("logout clears token and resets state", async () => {
    const { getMe } = await import("@/api/account");
    const { clearToken } = await import("@/api/auth");
    vi.mocked(getMe).mockResolvedValue(PAID_ME);

    const { result } = renderHook(() => useAuthProvider());

    await act(async () => {
      await result.current.login("tok");
    });

    expect(result.current.token).toBe("tok");

    act(() => {
      result.current.logout();
    });

    expect(clearToken).toHaveBeenCalled();
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.tier).toBe("free");
  });

  it("clears token when getMe fails", async () => {
    const { getMe } = await import("@/api/account");
    const { clearToken, getSavedToken } = await import("@/api/auth");
    vi.mocked(getSavedToken).mockReturnValue("bad-tok");
    vi.mocked(getMe).mockRejectedValue(new Error("401 Unauthorized"));

    const { result } = renderHook(() => useAuthProvider());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(clearToken).toHaveBeenCalled();
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
