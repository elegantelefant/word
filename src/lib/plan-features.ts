// ABOUTME: Which add-in features a signed-in account's plan includes, from the limits /me reports.
// ABOUTME: 0 means not included; a missing limit leaves the decision to the server, which enforces quotas anyway.

import type { MeResponse } from "@/types/api";

export type PlanFeature = "draft" | "clauseLibrary" | "mammoth";

// /me entitlement keys per feature (monorepo core/plan_defaults.py). A feature is open when any one
// group is wholly non-zero: the quota gate refuses when either the monthly or the daily limit is 0
// (dependencies/check_quota.py), and the clause library opens on either clause limit
// (services/clause_library_entitlement.py). Mammoth needs its tool flag (mammoth_tool_entitlement.py).
const LIMIT_GROUPS: Record<PlanFeature, string[][]> = {
  draft: [["draftRequestsMonthly", "draftRequestsDaily"]],
  clauseLibrary: [
    ["clauseSuggestRequestsMonthly", "clauseSuggestRequestsDaily"],
    ["clauseProcessRequestsMonthly", "clauseProcessRequestsDaily"],
  ],
  mammoth: [["hasMammothTool"]],
};

export function planIncludes(me: MeResponse | null, feature: PlanFeature): boolean {
  const entitlements = me?.entitlements as Record<string, unknown> | undefined;
  return LIMIT_GROUPS[feature].some((group) =>
    group.every((key) => {
      const limit = entitlements?.[key];
      return typeof limit !== "number" || limit !== 0;
    }),
  );
}

// Server refusals that a different plan or more credits would lift (monorepo check_quota.py, check_credits.py).
const PLAN_LIMIT_REASONS = new Set(["feature_disabled", "over_plan_quota", "credits_exhausted"]);

export function isPlanLimit(reason: string | undefined): boolean {
  return reason !== undefined && PLAN_LIMIT_REASONS.has(reason);
}
