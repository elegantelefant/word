// ABOUTME: Tests which add-in features a signed-in account's plan includes, read from /me entitlements.
// ABOUTME: Values are the monorepo's plan_defaults for each profile at origin/dev 206990b64 (0 = not included, -1 = unlimited).

import { describe, it, expect } from "vitest";
import { isPlanLimit, planIncludes } from "@/lib/plan-features";
import type { MeResponse } from "@/types/api";

const me = (entitlements: Record<string, unknown> | undefined) =>
  ({ user: { id: "u", email: "e", name: "n" }, org: null, entitlements } as unknown as MeResponse);

const LITE = { draftRequestsMonthly: 10, draftRequestsDaily: 2, clauseSuggestRequestsMonthly: 0, clauseSuggestRequestsDaily: 0, clauseProcessRequestsMonthly: 0, clauseProcessRequestsDaily: 0, hasMammothTool: 0 };
const EXPLORER = { ...LITE, draftRequestsMonthly: -1, draftRequestsDaily: -1 };
const PRO = { ...EXPLORER, clauseSuggestRequestsMonthly: 50, clauseSuggestRequestsDaily: 10, clauseProcessRequestsMonthly: 50, clauseProcessRequestsDaily: 10 };
const PILOT = { ...PRO, hasMammothTool: 1 };
const MAMMOTH_STAFF = { ...LITE, draftRequestsMonthly: 0, draftRequestsDaily: 0, hasMammothTool: 1 };

describe("planIncludes (#98)", () => {
  it.each([
    ["Lite", LITE, { draft: true, clauseLibrary: false, mammoth: false }],
    ["Explorer", EXPLORER, { draft: true, clauseLibrary: false, mammoth: false }],
    ["Pro", PRO, { draft: true, clauseLibrary: true, mammoth: false }],
    ["pilot", PILOT, { draft: true, clauseLibrary: true, mammoth: true }],
    ["mammoth_staff", MAMMOTH_STAFF, { draft: false, clauseLibrary: false, mammoth: true }],
  ])("%s includes what its limits allow", (_, entitlements, expected) => {
    const user = me(entitlements);
    expect({
      draft: planIncludes(user, "draft"),
      clauseLibrary: planIncludes(user, "clauseLibrary"),
      mammoth: planIncludes(user, "mammoth"),
    }).toEqual(expected);
  });

  it("opens the clause library on either clause limit", () => {
    expect(planIncludes(me({ ...LITE, clauseProcessRequestsMonthly: 5, clauseProcessRequestsDaily: 1 }), "clauseLibrary")).toBe(true);
  });

  it("treats a daily limit of 0 as not included, as the quota gate does", () => {
    expect(planIncludes(me({ draftRequestsMonthly: 10, draftRequestsDaily: 0 }), "draft")).toBe(false);
  });

  it("leaves the decision to the server when /me omits a limit", () => {
    expect(planIncludes(me(undefined), "draft")).toBe(true);
    expect(planIncludes(null, "clauseLibrary")).toBe(true);
  });
});

describe("isPlanLimit (#98)", () => {
  it.each(["feature_disabled", "over_plan_quota", "credits_exhausted"])("treats %s as a refusal a plan would lift", (reason) => {
    expect(isPlanLimit(reason)).toBe(true);
  });

  it.each([undefined, "quota_backend_unavailable", "backend_error"])("does not treat %s as one", (reason) => {
    expect(isPlanLimit(reason)).toBe(false);
  });
});
