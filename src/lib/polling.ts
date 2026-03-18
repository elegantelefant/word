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
  signal?: AbortSignal,
): Promise<JobResult> {
  for (let i = 0; i < maxAttempts; i++) {
    signal?.throwIfAborted();
    const job = await apiFetch<Job>(`/jobs/${jobId}`, token, { signal });

    if (job.status === "completed") {
      return apiFetch<JobResult>(`/jobs/${jobId}/result`, token, { signal });
    }

    if (job.status === "failed") {
      throw new Error(job.error ?? "Job failed");
    }

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, intervalMs);
      signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
    });
  }

  throw new Error("Job timed out");
}
