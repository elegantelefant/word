// ABOUTME: Auth hook — manages login, logout, token refresh, and tier detection.
// ABOUTME: On mount, checks for saved token and loads user profile if found.

import { useState, useEffect, useCallback, useMemo } from "react";
import type { AuthContextValue, AuthState } from "@/store/auth";
import { AUTH_INITIAL } from "@/store/auth";
import type { MeResponse, Tier } from "@/types/api";
import { getMe } from "@/api/account";
import { getSavedToken, clearToken, openLoginDialog, saveToken, signInNeedsClick, tokenExpiresAt } from "@/api/auth";

const REFRESH_LEAD_MS = 60_000;
// "paid" is Elefant mode: any signed-in account, Lite included, works through Elefant and spends that
// account's own quota and credits, which the server enforces (owner, 17 Nov). Only an anonymous
// session stays on the user's own Gemini key. What each plan includes is decided per feature.
function determineTier(me: MeResponse): Tier {
  return me.anonymous ? "free" : "paid";
}

export function useAuthProvider(): AuthContextValue {
  // Start in a loading state when a saved token exists, so a returning user
  // doesn't render as signed-out for the frame before loadUser kicks in.
  const [state, setState] = useState<AuthState>(() => ({
    ...AUTH_INITIAL,
    loading: !!getSavedToken(),
  }));

  const logout = useCallback(() => {
    clearToken();
    setState(AUTH_INITIAL);
  }, []);

  const loadUser = useCallback(async (token: string, isCurrent: () => boolean = () => true) => {
    const expiresAt = tokenExpiresAt(token);
    if (expiresAt !== null && expiresAt <= Date.now()) {
      logout();
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const user = await getMe(token);
      if (!isCurrent()) return;
      const tier = determineTier(user);
      setState({ token, user, tier, loading: false });
    } catch {
      if (isCurrent()) logout();
    }
  }, [logout]);

  // Check for saved token on mount
  useEffect(() => {
    const saved = getSavedToken();
    if (saved) {
      void loadUser(saved);
    }
  }, [loadUser]);

  useEffect(() => {
    if (!state.token) return;
    const expiresAt = tokenExpiresAt(state.token);
    // A popup opened from a timer is blocked where sign-in needs a click; re-sign-in waits for the user.
    if (expiresAt === null || signInNeedsClick()) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (expiresAt <= Date.now()) {
        logout();
        return;
      }
      try {
        const token = await openLoginDialog();
        if (cancelled) {
          // The dialog persists its result, even if the user has since signed out.
          if (getSavedToken() === token) clearToken();
          return;
        }
        await loadUser(token, () => !cancelled);
      } catch {
        if (!cancelled) logout();
      }
    }, Math.max(0, expiresAt - Date.now() - REFRESH_LEAD_MS));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state.token, loadUser, logout]);

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

  return useMemo(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );
}
