// ABOUTME: TypeScript types for the Elefant API, scoped to contract 0.305.0.
// ABOUTME: Covers only operations word actually calls — see agent_docs/2026-09-22-w0-callsite-inventory.md.

// -- Review --

export interface ReviewRequest {
  text: string;
  instructions?: string | null;
  context?: {
    jurisdiction?: string;
    document_type?: string;
    playbook_id?: string;
    risk_tolerance?: "low" | "medium" | "high";
  };
}

/** Mirrors contract `ReviewIssueResult` — one red-flag finding within a review result. */
export interface ReviewIssue {
  category: string;
  severity: string;
  recommendation: string;
  clauseReference: string;
  sourceFilename: string;
  description: string;
  explanation: string;
}

export interface ReviewResponse {
  summary: string;
  issues?: ReviewIssue[];
}

// -- Research --

/** Mirrors contract `ResearchRequest`, trimmed to the field word sends. */
export interface ResearchRequest {
  question: string;
}

// -- Jobs --

export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type JobType = "review" | "draft" | "research" | "citation_check" | "translate" | "process" | "mammoth";

/** Mirrors contract `JobCreatedResponse`. */
export interface JobCreated {
  jobId: string;
  pollUrl: string;
  status: "queued";
}

/** Mirrors contract `JobResponse`, trimmed to fields word reads. */
export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  createdAt: string;
  query?: string | null;
  error?: string | null;
}

/**
 * Mirrors contract `JobResultResponse`. `result` is left generic — its real shape is a
 * job-type-specific discriminated union (ReviewResult, ResearchResult, ...) that callers
 * cast explicitly once they know which job they polled.
 */
export interface JobResult {
  id: string;
  status: JobStatus;
  result?: Record<string, unknown> | null;
}

// -- Account --

export interface MeUser {
  id: string;
  email: string;
  name: string;
}

export interface MeOrg {
  id: string;
  name: string;
  slug: string;
  accountType: string;
}

export interface MeResponse {
  user: MeUser;
  org: MeOrg;
}

// -- Tier --

export type Tier = "free" | "paid";
