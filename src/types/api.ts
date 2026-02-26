// ABOUTME: TypeScript types derived from the Elefant API OpenAPI spec.
// ABOUTME: Covers review, jobs, account, clauses, and auth contracts.

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

export type IssueKind = "risk" | "ambiguity" | "missing" | "style" | "other";

export interface ReviewIssue {
  message: string;
  kind?: IssueKind;
  location?: string | null;
  suggestion?: string | null;
}

export interface ReviewResponse {
  summary: string;
  issues?: ReviewIssue[];
}

// -- Jobs --

export type JobStatus = "queued" | "running" | "completed" | "failed";
export type JobType = "review" | "draft" | "research" | "citation_check" | "translate" | "process" | "mammoth";

export interface JobCreated {
  job_id: string;
  poll_url: string;
  status: "queued";
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  created_at: string;
  query?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
}

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
  role?: string | null;
  org_role?: string | null;
}

export interface MeOrg {
  id: string;
  name: string;
  slug: string;
  account_type: string;
}

export interface MeResponse {
  user: MeUser;
  org: MeOrg;
  entitlements: Record<string, unknown>;
  preferences?: { data_training_opt_out?: boolean };
}

// -- Auth --

export interface WhoamiResponse {
  user_id: string;
  org_id: string;
}

export interface AuthError {
  detail: string;
  hint?: string | null;
}

// -- Clauses --

export interface ClauseSearchRequest {
  query: string;
  limit?: number;
}

export interface ClauseSearchResponse {
  query?: string | null;
  results?: Record<string, unknown>[];
  status?: string;
}

// -- Gateway (BYOK) --

export interface GatewayMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GatewayRequest {
  model: string;
  messages: GatewayMessage[];
  result_type?: string;
}

export interface GatewayResponse {
  content: string;
}

// -- Tier --

export type Tier = "free" | "paid";
