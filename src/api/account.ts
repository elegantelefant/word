// ABOUTME: Account API — fetches current user profile and entitlements.
// ABOUTME: Used after auth to determine tier (free vs paid).

import type { MeResponse, WhoamiResponse } from "@/types/api";
import { apiFetch } from "./client";

export async function getMe(token: string): Promise<MeResponse> {
  return apiFetch<MeResponse>("/me", token);
}

export async function whoami(token: string): Promise<WhoamiResponse> {
  return apiFetch<WhoamiResponse>("/whoami", token);
}
