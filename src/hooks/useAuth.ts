// ABOUTME: Auth hook — manages login, logout, token refresh, and tier detection.
// ABOUTME: On mount, checks for saved token and loads user profile if found.

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { AuthContextValue, AuthState } from "@/store/auth";
import { AUTH_INITIAL } from "@/store/auth";
import type { MeResponse, Tier } from "@/types/api";
import { ApiError } from "@/api/client";
import { setOnAuthError } from "@/api/client";
import { getMe } from "@/api/account";
import { getSavedToken, clearToken, openLoginDialog, saveToken } from "@/api/auth";

function determineTier(me: MeResponse): Tier {
  const accountType = me.org.account_type?.toLowerCase();
  if (accountType === "free" || accountType === "trial") return "free";
  return "paid";
}

export function useAuthProvider(): AuthContextValue {
  const [state, setState] = useState<AuthState>(AUTH_INITIAL);
  const loginInFlight = useRef(false);

  const logout = useCallback(() => {
    clearToken();
    setState(AUTH_INITIAL);
  }, []);

  // Wire up centralized auth interceptor — any 401 from apiFetch triggers logout
  useEffect(() => {
    setOnAuthError(() => logout());
    return () => setOnAuthError(null);
  }, [logout]);

  const loadUser = useCallback(async (token: string) => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const user = await getMe(token);
      const tier = determineTier(user);
      setState({ token, user, tier, loading: false });
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        clearToken();
        setState({ ...AUTH_INITIAL, loading: false });
      } else {
        // Network error — keep token, stop loading
        setState((prev) => ({ ...prev, loading: false }));
      }
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
    if (loginInFlight.current) return;
    loginInFlight.current = true;
    try {
      if (tokenOrEmpty) {
        saveToken(tokenOrEmpty);
        await loadUser(tokenOrEmpty);
        return;
      }
      // Open dialog flow
      const token = await openLoginDialog();
      await loadUser(token);
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    } finally {
      loginInFlight.current = false;
    }
  }, [loadUser]);

  return useMemo(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );
}
