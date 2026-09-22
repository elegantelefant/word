// ABOUTME: Jobs API — list async jobs for the current user.
// ABOUTME: Used by Full Analysis panel and History panel.

import type { Job } from "@/types/api";
import { apiFetch } from "./client";

export async function listJobs(
  token: string,
  status?: string,
  type?: string,
): Promise<Job[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (type) params.set("type", type);
  const qs = params.toString();
  const res = await apiFetch<{ jobs: Job[] }>(`/jobs${qs ? `?${qs}` : ""}`, token);
  return res.jobs;
}
