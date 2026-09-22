// ABOUTME: Review API — dispatches to ADK-JS agent in-browser (free) or Elefant API (paid).
// ABOUTME: Free tier uses Gemini via BYOK key; paid path creates a job and polls for results.

import type { JobCreated, JobResult, ReviewRequest, ReviewResponse, ResearchRequest } from "@/types/api";
import { apiFetch } from "./client";
import { pollForResult } from "@/lib/polling";

export interface FullAnalysisResult {
  review?: ReviewResponse;
  research?: { report: string };
}

/** Free-tier review: runs ADK-JS agent in-browser with user's Gemini API key. */
export async function reviewFree(
  text: string,
  apiKey: string,
  model: string,
  instructions?: string,
): Promise<ReviewResponse> {
  const { runReview } = await import("@/lib/agent");
  const result = await runReview(apiKey, model, text, instructions);
  return {
    summary: result.summary,
    // Mechanical mapping onto the contract's ReviewIssueResult shape: the agent has no
    // notion of severity or source filename, so those are left blank.
    issues: result.issues.map((issue) => ({
      category: issue.kind,
      severity: "",
      recommendation: issue.suggestion ?? "",
      clauseReference: issue.location ?? "",
      sourceFilename: "",
      description: issue.message,
      explanation: "",
    })),
  };
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
  const result = await pollForResult(job.jobId, token);
  return (result.result as unknown as ReviewResponse) ?? { summary: "No result returned.", issues: [] };
}

/** Polls a job until completed, returns the result payload. */
export async function pollJobResult(jobId: string, token: string, signal?: AbortSignal): Promise<JobResult> {
  return pollForResult(jobId, token, undefined, undefined, signal);
}

/** Full analysis: fires parallel review + research jobs, polls both. */
export async function runFullAnalysis(text: string, token: string, signal?: AbortSignal): Promise<FullAnalysisResult> {
  const researchBody: ResearchRequest = {
    question: `Analyze the following legal text and identify all legal risks, obligations, and key terms:\n\n${text}`,
  };

  const [reviewJob, researchJob] = await Promise.all([
    apiFetch<JobCreated>("/review", token, { method: "POST", body: { text }, signal }),
    apiFetch<JobCreated>("/research", token, { method: "POST", body: researchBody, signal }).catch(() => null),
  ]);

  const [reviewResult, researchResult] = await Promise.all([
    pollForResult(reviewJob.jobId, token, undefined, undefined, signal),
    researchJob ? pollForResult(researchJob.jobId, token, undefined, undefined, signal).catch(() => null) : null,
  ]);

  const results: FullAnalysisResult = {};
  results.review = reviewResult.result as unknown as ReviewResponse;
  if (researchResult?.result) {
    results.research = researchResult.result as unknown as { report: string };
  }
  return results;
}
