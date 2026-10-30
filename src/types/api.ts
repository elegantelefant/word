// ABOUTME: API types for the operations Word uses, derived by Orval.
// ABOUTME: Preserve the contract field names and optionality in every exported alias.
import type {
  JobCreatedResponse,
  JobResponse,
  JobResultResponse,
  MeUser,
  MeOrg,
  ReviewResult,
} from "@/api/generated/client";

export type { ReviewRequest, ResearchRequest, ReviewIssueResult as ReviewIssue } from "@/api/generated/client";
export type ReviewResponse = Omit<ReviewResult, "jobType">;
export type IssueKind = NonNullable<import("@/api/generated/client").ReviewIssue["kind"]>;

export type { MeResponse, MeUser, MeOrg } from "@/api/generated/client";
export type JobCreated = JobCreatedResponse;
export type Job = JobResponse;
export type JobStatus = JobResponse["status"];
export type JobType = JobResponse["type"];

// Existing polling exposes raw result dictionaries, before operation-specific decoding.
// Derive all known result keys from the generated union while allowing callers to
// inspect a property without first narrowing the backend's jobType discriminator.
type UnionKeys<T> = T extends unknown ? keyof T : never;
type UnionValue<T, K extends PropertyKey> = T extends unknown ? K extends keyof T ? T[K] : never : never;
type Result = NonNullable<JobResultResponse["result"]>;
export type JobResult = Omit<JobResultResponse, "result"> & {
  result?: { [K in UnionKeys<Result>]?: UnionValue<Result, K> } | null;
};

// /whoami is a legacy proxy operation absent from openapi.json; its identifiers
// share the account schema's identifier types. Do not invent a generated route.
export type WhoamiResponse = { user_id: MeUser["id"]; org_id: MeOrg["id"] };

// Local UI state, not an API schema.
export type Tier = "free" | "paid";
