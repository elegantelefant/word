// ABOUTME: Tests which add-in features a signed-in account's plan includes, read from /me entitlements.
// ABOUTME: Values are the monorepo's plan_defaults for each profile (0 = not included, -1 = unlimited).

import { describe, it, expect } from "vitest";
import { planIncludes } from "@/lib/plan-features";
import type { MeResponse } from "@/types/api";

const me = (entitlements: Record<string, unknown> | undefined) =>
  ({ user: { id: "u", email: "e", name: "n" }, org: null, entitlements } as unknown as MeResponse);

// Lite (individual): review 30, draft 10, clause suggest/process 0 (plan_defaults.py, origin/dev 206990b64).
const LITE = { plan: "lite", reviewRequestsMonthly: 30, draftRequestsMonthly: 10, clauseSuggestRequestsMonthly: 0, clauseProcessRequestsMonthly: 0 };
const EXPLORER = { plan: "explorer", reviewRequestsMonthly: 30, draftRequestsMonthly: -1, clauseSuggestRequestsMonthly: 0, clauseProcessRequestsMonthly: 0 };
const PRO = { plan: "pro", reviewRequestsMonthly: 50, draftRequestsMonthly: -1, clauseSuggestRequestsMonthly: 50, clauseProcessRequestsMonthly: 50 };
const MAMMOTH_STAFF = { plan: "mammoth_staff", reviewRequestsMonthly: 0, draftRequestsMonthly: 0, clauseSuggestRequestsMonthly: 0, clauseProcessRequestsMonthly: 0 };

describe("planIncludes (#98)", () => {
  it.each([
    ["Lite", LITE, { review: true, draft: true, clauseLibrary: false }],
    ["Explorer", EXPLORER, { review: true, draft: true, clauseLibrary: false }],
    ["Pro", PRO, { review: true, draft: true, clauseLibrary: true }],
    ["mammoth_staff", MAMMOTH_STAFF, { review: false, draft: false, clauseLibrary: false }],
  ])("%s includes what its limits allow", (_, entitlements, expected) => {
    const user = me(entitlements);
    expect({
      review: planIncludes(user, "review"),
      draft: planIncludes(user, "draft"),
      clauseLibrary: planIncludes(user, "clauseLibrary"),
    }).toEqual(expected);
  });

  it("includes the clause library when either clause limit is non-zero", () => {
    expect(planIncludes(me({ clauseSuggestRequestsMonthly: 0, clauseProcessRequestsMonthly: 5 }), "clauseLibrary")).toBe(true);
  });

  it("leaves the decision to the server when /me omits a limit", () => {
    expect(planIncludes(me(undefined), "draft")).toBe(true);
    expect(planIncludes(null, "review")).toBe(true);
  });
});
