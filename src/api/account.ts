// ABOUTME: Account API — fetches current user profile and entitlements.
// ABOUTME: Used after auth to determine tier (free vs paid).

import type { MeResponse } from "@/types/api";
import { apiFetch } from "./client";

export async function getMe(token: string): Promise<MeResponse> {
  return apiFetch<MeResponse>("/me", token);
}
