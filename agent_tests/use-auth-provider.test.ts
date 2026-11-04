// ABOUTME: Tests for useAuthProvider hook — login, logout, tier detection, saved token.
// ABOUTME: Mocks api/account and api/auth to isolate hook state transitions.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useAuthProvider } from "@/hooks/useAuth";
import { getMe } from "@/api/account";
import { getSavedToken, clearToken, openLoginDialog } from "@/api/auth";

vi.mock("@/api/account", () => ({
  getMe: vi.fn(),
}));

vi.mock("@/api/auth", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/api/auth")>(),
  getSavedToken: vi.fn(() => null),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
  openLoginDialog: vi.fn(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(getSavedToken).mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const PAID_ME = {
  user: { id: "u1", email: "a@b.com", name: "Alice" },
  org: { id: "o1", name: "LegalCo", slug: "legalco", accountType: "commercial" },
  entitlements: ["review", "clauses"],
};

const FREE_ME = {
  user: { id: "u2", email: "b@b.com", name: "Bob" },
  org: { id: "o2", name: "FreeCo", slug: "freeco", accountType: "free" },
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

  it("detects free tier from accountType", async () => {
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
      org: { ...PAID_ME.org, accountType: "trial" },
    };
    const { getMe } = await import("@/api/account");
    vi.mocked(getMe).mockResolvedValue(trialMe);

    const { result } = renderHook(() => useAuthProvider());

    await act(async () => {
      await result.current.login("trial-tok");
    });

    expect(result.current.tier).toBe("free");
  });

  it.each([null, undefined])("loads a profile whose organization is %s", async (org) => {
    const { getMe } = await import("@/api/account");
    vi.mocked(getMe).mockResolvedValue({ ...PAID_ME, org });
    const { result } = renderHook(() => useAuthProvider());
    await act(async () => {
      await result.current.login("orgless-tok");
    });
    expect(result.current.token).toBe("orgless-tok");
    expect(result.current.user?.org).toBe(org);
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

function tokenExpiringIn(milliseconds: number): string {
  return `header.${btoa(JSON.stringify({ exp: (Date.now() + milliseconds) / 1000 }))}.signature`;
}

describe("useAuthProvider token refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T12:00:00Z"));
    vi.mocked(getMe).mockResolvedValue(PAID_ME);
  });

  it("re-mints one minute before expiry and schedules the next token", async () => {
    const saved = tokenExpiringIn(3_600_000);
    const renewed = tokenExpiringIn(7_200_000);
    const next = tokenExpiringIn(10_800_000);
    vi.mocked(getSavedToken).mockReturnValue(saved);
    vi.mocked(openLoginDialog).mockResolvedValueOnce(renewed).mockResolvedValueOnce(next);
    const { result } = renderHook(() => useAuthProvider());
    await act(async () => {});

    await act(async () => { await vi.advanceTimersByTimeAsync(3_539_999); });
    expect(openLoginDialog).not.toHaveBeenCalled();
    expect(result.current.token).toBe(saved);

    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(openLoginDialog).toHaveBeenCalledTimes(1);
    expect(getMe).toHaveBeenLastCalledWith(renewed);
    expect(result.current.token).toBe(renewed);
    expect(result.current.tier).toBe("paid");

    await act(async () => { await vi.advanceTimersByTimeAsync(3_599_999); });
    expect(openLoginDialog).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(openLoginDialog).toHaveBeenCalledTimes(2);
    expect(result.current.token).toBe(next);
  });

  it("logs out when re-minting fails", async () => {
    vi.mocked(getSavedToken).mockReturnValue(tokenExpiringIn(3_600_000));
    vi.mocked(openLoginDialog).mockRejectedValue(new Error("Login dialog was closed"));
    const { result } = renderHook(() => useAuthProvider());
    await act(async () => {});
    expect(result.current.tier).toBe("paid");

    await act(async () => { await vi.advanceTimersByTimeAsync(3_540_000); });
    expect(openLoginDialog).toHaveBeenCalledTimes(1);
    expect(clearToken).toHaveBeenCalledTimes(1);
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.tier).toBe("free");
    expect(result.current.loading).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(3_600_000); });
    expect(openLoginDialog).toHaveBeenCalledTimes(1);
  });

  it.each([-1000, 0])("clears a saved token expired by %i ms without loading a profile", async (offset) => {
    vi.mocked(getSavedToken).mockReturnValue(tokenExpiringIn(offset));
    const { result } = renderHook(() => useAuthProvider());
    await act(async () => {});

    expect(clearToken).toHaveBeenCalledTimes(1);
    expect(getMe).not.toHaveBeenCalled();
    expect(openLoginDialog).not.toHaveBeenCalled();
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("re-mints immediately when the saved token is inside the refresh window", async () => {
    const renewed = tokenExpiringIn(3_600_000);
    vi.mocked(getSavedToken).mockReturnValue(tokenExpiringIn(30_000));
    vi.mocked(openLoginDialog).mockResolvedValue(renewed);
    const { result } = renderHook(() => useAuthProvider());
    await act(async () => {});

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(openLoginDialog).toHaveBeenCalledTimes(1);
    expect(result.current.token).toBe(renewed);
  });

  it("cancels the refresh timer on logout", async () => {
    vi.mocked(getSavedToken).mockReturnValue(tokenExpiringIn(3_600_000));
    const { result } = renderHook(() => useAuthProvider());
    await act(async () => {});
    act(() => { result.current.logout(); });

    await act(async () => { await vi.advanceTimersByTimeAsync(3_600_000); });
    expect(openLoginDialog).not.toHaveBeenCalled();
    expect(result.current.token).toBeNull();
  });

  it("cancels the refresh timer on unmount", async () => {
    vi.mocked(getSavedToken).mockReturnValue(tokenExpiringIn(3_600_000));
    const { unmount } = renderHook(() => useAuthProvider());
    await act(async () => {});
    unmount();

    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(openLoginDialog).not.toHaveBeenCalled();
  });

  it("discards a refresh dialog result delivered after logout", async () => {
    const renewed = tokenExpiringIn(7_200_000);
    let finishDialog!: (token: string) => void;
    vi.mocked(getSavedToken).mockReturnValue(tokenExpiringIn(3_600_000));
    vi.mocked(openLoginDialog).mockReturnValue(new Promise((resolve) => { finishDialog = resolve; }));
    const { result } = renderHook(() => useAuthProvider());
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(3_540_000); });
    act(() => { result.current.logout(); });

    // The real dialog saves its token before resolving.
    vi.mocked(getSavedToken).mockReturnValue(renewed);
    await act(async () => { finishDialog(renewed); });
    expect(clearToken).toHaveBeenCalledTimes(2);
    expect(getMe).toHaveBeenCalledTimes(1);
    expect(result.current.token).toBeNull();
  });

  it("does not restore a refreshed profile that arrives after logout", async () => {
    let finishProfile!: (user: typeof PAID_ME) => void;
    vi.mocked(getSavedToken).mockReturnValue(tokenExpiringIn(3_600_000));
    vi.mocked(getMe).mockResolvedValueOnce(PAID_ME)
      .mockReturnValueOnce(new Promise((resolve) => { finishProfile = resolve; }));
    vi.mocked(openLoginDialog).mockResolvedValue(tokenExpiringIn(7_200_000));
    const { result } = renderHook(() => useAuthProvider());
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(3_540_000); });
    expect(getMe).toHaveBeenCalledTimes(2);
    act(() => { result.current.logout(); });

    await act(async () => { finishProfile(PAID_ME); });
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
