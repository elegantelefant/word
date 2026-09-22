// ABOUTME: Auth hook — manages login, logout, token refresh, and tier detection.
// ABOUTME: On mount, checks for saved token and loads user profile if found.

import { useState, useEffect, useCallback, useMemo } from "react";
import type { AuthContextValue, AuthState } from "@/store/auth";
import { AUTH_INITIAL } from "@/store/auth";
import type { MeResponse, Tier } from "@/types/api";
import { getMe } from "@/api/account";
import { getSavedToken, clearToken, openLoginDialog, saveToken } from "@/api/auth";

function determineTier(me: MeResponse): Tier {
  const accountType = me.org.accountType?.toLowerCase();
  if (accountType === "free" || accountType === "trial") return "free";
  return "paid";
}

export function useAuthProvider(): AuthContextValue {
  // Start in a loading state when a saved token exists, so a returning user
  // doesn't render as signed-out for the frame before loadUser kicks in.
  const [state, setState] = useState<AuthState>(() => ({
    ...AUTH_INITIAL,
    loading: !!getSavedToken(),
  }));

  const loadUser = useCallback(async (token: string) => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const user = await getMe(token);
      const tier = determineTier(user);
      setState({ token, user, tier, loading: false });
    } catch {
      clearToken();
      setState({ ...AUTH_INITIAL, loading: false });
    }
  }, []);

  // Check for saved token on mount
  useEffect(() => {
    const saved = getSavedToken();
    if (saved) {
      void loadUser(saved);
    }
  }, [loadUser]);

  const login = useCallback(async (tokenOrEmpty?: string) => {
    if (tokenOrEmpty) {
      saveToken(tokenOrEmpty);
      await loadUser(tokenOrEmpty);
      return;
    }
    // Open dialog flow
    const token = await openLoginDialog();
    await loadUser(token);
  }, [loadUser]);

  const logout = useCallback(() => {
    clearToken();
    setState(AUTH_INITIAL);
  }, []);

  return useMemo(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );
}
