// ABOUTME: Review API — dispatches to ADK-JS agent in-browser (free) or Elefant API (paid).
// ABOUTME: Free tier uses Gemini via BYOK key; paid path creates a job and polls for results.

import type { JobCreated, JobResult, ReviewRequest, ReviewResponse, ResearchRequest } from "@/types/api";
import { z } from "zod";
import { getJobResultResponse } from "@/api/generated/schemas";
import { apiFetch } from "./client";
import { pollForResult } from "@/lib/polling";

// The generated result union starts with ResearchResult, MultiReviewResult,
// DraftResult, ReviewResult. Keep their contract fields and optionality while
// accepting older payloads without jobType and preserving future fields.
const [researchContract, , , reviewContract] = getJobResultResponse.shape.result.unwrap().options[0].options;
const reviewResultSchema = reviewContract.extend({
  jobType: reviewContract.shape.jobType.optional(),
  issues: reviewContract.shape.issues.unwrap().element.passthrough().array().optional(),
}).passthrough();
const researchResultSchema = researchContract.extend({
  jobType: researchContract.shape.jobType.optional(),
}).passthrough();

function parseJobResult<T>(schema: z.ZodType<T>, payload: unknown, jobType: "review" | "research"): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new Error(`Invalid ${jobType} job result`);
  return parsed.data;
}

export interface FreeReviewResponse {
  summary: string;
  issues: {
    message: string;
    kind?: "risk" | "ambiguity" | "missing" | "style" | "other";
    location?: string | null;
    suggestion?: string | null;
  }[];
}

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
): Promise<FreeReviewResponse> {
  const { runReview } = await import("@/lib/agent");
  const result = await runReview(apiKey, model, text, instructions);
  return {
    summary: result.summary,
    issues: result.issues.map((issue) => ({
      message: issue.message,
      kind: issue.kind,
      location: issue.location ?? null,
      suggestion: issue.suggestion ?? null,
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
  return parseJobResult(reviewResultSchema, result.result, "review");
}

/** Polls a job until completed, returns the result payload. */
export async function pollJobResult(jobId: string, token: string, signal?: AbortSignal): Promise<JobResult> {
  return pollForResult(jobId, token, undefined, undefined, signal);
}

/** Full analysis: fires parallel review + research jobs, polls both. */
export async function runFullAnalysis(text: string, token: string, signal?: AbortSignal): Promise<FullAnalysisResult> {
  const jobs = await Promise.allSettled([
    apiFetch<JobCreated>("/review", token, { method: "POST", body: { text }, signal }),
    apiFetch<JobCreated>("/research", token, {
      method: "POST",
      body: { question: `Analyze the following legal text and identify all legal risks, obligations, and key terms:\n\n${text}` } satisfies ResearchRequest,
      signal,
    }),
  ]);

  const pollCreatedJob = async (job: PromiseSettledResult<JobCreated>) => {
    if (job.status === "rejected") throw job.reason;
    return pollForResult(job.value.jobId, token, undefined, undefined, signal);
  };
  const [reviewResult, researchResult] = await Promise.allSettled([
    pollCreatedJob(jobs[0]).then((result) => parseJobResult(reviewResultSchema, result.result, "review")),
    pollCreatedJob(jobs[1]).then((result) => parseJobResult(researchResultSchema, result.result, "research")),
  ]);

  const results: FullAnalysisResult = {};
  if (reviewResult.status === "fulfilled") {
    results.review = reviewResult.value;
  }
  if (researchResult.status === "fulfilled") {
    results.research = researchResult.value;
  }
  if (!results.review && !results.research && reviewResult.status === "rejected") {
    throw reviewResult.reason;
  }
  return results;
}
