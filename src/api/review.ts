// ABOUTME: Review API — dispatches to BYOK gateway (free) or Elefant API (paid).
// ABOUTME: Paid path creates a job and polls for results.

import type { JobCreated, JobResult, ReviewRequest, ReviewResponse } from "@/types/api";
import { apiFetch } from "./client";
import { reviewViaGateway } from "./gateway";
import { pollForResult } from "@/lib/polling";

/** Free-tier review: direct LLM call via gateway with user's key. */
export async function reviewFree(
  text: string,
  apiKey: string,
  model: string,
  instructions?: string,
): Promise<ReviewResponse> {
  return reviewViaGateway(text, apiKey, model, instructions);
}

/** Paid-tier review: POST /review → poll job → get result. */
export async function reviewPaid(
  text: string,
  token: string,
  instructions?: string,
  context?: ReviewRequest["context"],
): Promise<ReviewResponse> {
  const body: ReviewRequest = { text, instructions, context };
  const job = await apiFetch<JobCreated>("/review", token, { method: "POST", body });
  const result = await pollForResult(job.job_id, token);
  return (result.result as unknown as ReviewResponse) ?? { summary: "No result returned.", issues: [] };
}

/** Polls a job until completed, returns the result payload. */
export async function getJobResult(jobId: string, token: string): Promise<JobResult> {
  return pollForResult(jobId, token);
}
