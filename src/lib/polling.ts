// ABOUTME: Generic async job polling utility for Elefant API jobs.
// ABOUTME: Polls GET /jobs/{id} until completed or failed, then fetches result.

import type { Job, JobResult } from "@/types/api";
import { apiFetch, ApiError, NetworkError } from "@/api/client";

const POLL_INTERVAL_MS = 2_000;
const MAX_ATTEMPTS = 60;
const MAX_CONSECUTIVE_ERRORS = 3;

export async function pollForResult(
  jobId: string,
  token: string,
  maxAttempts = MAX_ATTEMPTS,
  intervalMs = POLL_INTERVAL_MS,
  signal?: AbortSignal,
): Promise<JobResult> {
  let consecutiveErrors = 0;
  for (let i = 0; i < maxAttempts; i++) {
    signal?.throwIfAborted();
    let job: Job | undefined;
    try {
      job = await apiFetch<Job>(`/jobs/${jobId}`, token, { signal });
      consecutiveErrors = 0;
    } catch (error) {
      signal?.throwIfAborted();
      const transient = error instanceof NetworkError || (error instanceof ApiError && error.status >= 500);
      if (!transient || ++consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) throw error;
    }

    if (job?.status === "completed") {
      return apiFetch<JobResult>(`/jobs/${jobId}/result`, token, { signal });
    }

    if (job?.status === "failed") {
      throw new Error(job.error ?? "Job failed");
    }

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, intervalMs);
      signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
    });
  }

  throw new Error("Job timed out");
}
