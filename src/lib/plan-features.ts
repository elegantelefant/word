// ABOUTME: Which add-in features a signed-in account's plan includes, from the limits /me reports.
// ABOUTME: 0 means not included; a missing limit leaves the decision to the server, which enforces quotas anyway.

import type { MeResponse } from "@/types/api";

export type PlanFeature = "review" | "draft" | "clauseLibrary";

// /me entitlement keys per feature (monorepo core/plan_defaults.py). The clause library is open when
// either clause limit is non-zero (services/clause_library_entitlement.py).
const LIMIT_KEYS: Record<PlanFeature, string[]> = {
  review: ["reviewRequestsMonthly"],
  draft: ["draftRequestsMonthly"],
  clauseLibrary: ["clauseSuggestRequestsMonthly", "clauseProcessRequestsMonthly"],
};

export function planIncludes(me: MeResponse | null, feature: PlanFeature): boolean {
  const entitlements = me?.entitlements as Record<string, unknown> | undefined;
  const limits = LIMIT_KEYS[feature].map((key) => entitlements?.[key]);
  if (limits.every((limit) => typeof limit !== "number")) return true;
  return limits.some((limit) => typeof limit === "number" && limit !== 0);
}

// Server refusals that a different plan or more credits would lift (monorepo check_quota.py, check_credits.py).
const PLAN_LIMIT_REASONS = new Set(["feature_disabled", "over_plan_quota", "credits_exhausted"]);

export function isPlanLimit(reason: string | undefined): boolean {
  return reason !== undefined && PLAN_LIMIT_REASONS.has(reason);
}
