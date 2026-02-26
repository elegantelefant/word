// ABOUTME: Generic async job polling utility for Elefant API jobs.
// ABOUTME: Polls GET /jobs/{id} until completed or failed, then fetches result.

import type { Job, JobResult } from "@/types/api";
import { apiFetch } from "@/api/client";

const POLL_INTERVAL_MS = 2_000;
const MAX_ATTEMPTS = 60;

export async function pollForResult(
  jobId: string,
  token: string,
  maxAttempts = MAX_ATTEMPTS,
  intervalMs = POLL_INTERVAL_MS,
): Promise<JobResult> {
  for (let i = 0; i < maxAttempts; i++) {
    const job = await apiFetch<Job>(`/jobs/${jobId}`, token);

    if (job.status === "completed") {
      return apiFetch<JobResult>(`/jobs/${jobId}/result`, token);
    }

    if (job.status === "failed") {
      throw new Error(job.error ?? "Job failed");
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Job timed out");
}
