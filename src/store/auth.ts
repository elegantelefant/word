// ABOUTME: React context for auth state — token, user profile, tier.
// ABOUTME: Paid users authenticate via Elefant; free users skip auth entirely.

import { createContext, useContext } from "react";
import type { MeResponse, Tier } from "@/types/api";

export interface AuthState {
  token: string | null;
  user: MeResponse | null;
  tier: Tier;
  loading: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (token?: string) => Promise<void>;
  logout: () => void;
}

export const AUTH_INITIAL: AuthState = {
  token: null,
  user: null,
  tier: "free",
  loading: false,
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
