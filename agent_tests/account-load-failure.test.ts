// ABOUTME: Tests what the pane does when a saved Elefant token is good but loading the account fails.
// ABOUTME: Only the network call (getMe) is replaced; token storage is the real localStorage code.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthProvider } from "@/hooks/useAuth";
import { getMe } from "@/api/account";
import { ApiError, NetworkError } from "@/api/client";
import { getSavedToken, saveToken } from "@/api/auth";

vi.mock("@/api/account", () => ({ getMe: vi.fn() }));

const ACCOUNT_LOAD_FAILED = "Couldn't load your Elefant account. Check your connection and try again.";

beforeEach(() => {
  localStorage.clear();
  vi.mocked(getMe).mockReset();
});

describe("account load failure (#87)", () => {
  it.each([
    ["offline", new NetworkError("Network request failed. Check your connection.")],
    ["rate limited", new ApiError(429, "Too many requests. Please wait a moment.")],
    ["server error", new ApiError(503, "Something went wrong while contacting Elefant. Please try again.")],
  ])("keeps the saved token when /me fails (%s)", async (_, error) => {
    saveToken("good-token");
    vi.mocked(getMe).mockRejectedValue(error);

    const { result } = renderHook(() => useAuthProvider());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getSavedToken()).toBe("good-token");
  });

  it("says the account could not be loaded", async () => {
    saveToken("good-token");
    vi.mocked(getMe).mockRejectedValue(new NetworkError("Network request failed. Check your connection."));

    const { result } = renderHook(() => useAuthProvider());

    await waitFor(() => expect(result.current.error).toBe(ACCOUNT_LOAD_FAILED));
  });

  it("signs out and forgets the token when Elefant rejects it (401)", async () => {
    saveToken("expired-on-server");
    vi.mocked(getMe).mockRejectedValue(new ApiError(401, "Session expired. Please sign in again."));

    const { result } = renderHook(() => useAuthProvider());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getSavedToken()).toBeNull();
  });
});
