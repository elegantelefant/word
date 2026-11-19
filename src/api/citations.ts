// ABOUTME: Citation check — POST /citations/check creates a job; the poller returns each citation's status.
// ABOUTME: Statuses are the API's own words; the panel turns them into plain labels for users.

import type { JobCreated } from "@/types/api";
import { z } from "zod";
import { apiFetch } from "./client";
import { pollForResult } from "@/lib/polling";

export type CitationStatus = "verified" | "mismatch" | "hallucinated" | "uncertain";

export interface CitationFinding {
  citation: string;
  status: CitationStatus;
  sourceUrl: string | null;
}

// The job result's items are untyped in the contract (CitationCheckResult.results); read only what the panel shows.
const resultSchema = z.object({
  results: z.array(z.object({
    citation: z.string().optional(),
    status: z.string().optional(),
    sourceUrl: z.string().nullable().optional(),
  }).passthrough()).optional(),
}).passthrough();

const STATUSES: readonly string[] = ["verified", "mismatch", "hallucinated", "uncertain"];

export async function checkCitations(text: string, token: string, signal?: AbortSignal): Promise<CitationFinding[]> {
  const job = await apiFetch<JobCreated>("/citations/check", token, { method: "POST", body: { text }, signal });
  const result = await pollForResult(job.jobId, token, undefined, undefined, signal);
  const parsed = resultSchema.safeParse(result.result);
  if (!parsed.success) throw new Error("Invalid citation check result");
  return (parsed.data.results ?? []).flatMap((item) =>
    item.citation
      ? [{
          citation: item.citation,
          status: (STATUSES.includes(item.status ?? "") ? item.status : "uncertain") as CitationStatus,
          sourceUrl: item.sourceUrl ?? null,
        }]
      : [],
  );
}
