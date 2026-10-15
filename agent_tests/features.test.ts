// ABOUTME: Tests for build-time feature flag decisions.
// ABOUTME: Verifies Full Analysis is enabled only by the exact true value.

import { describe, expect, it } from "vitest";
import { isFullAnalysisEnabled } from "@/lib/features";

describe("isFullAnalysisEnabled", () => {
  it("is disabled when the flag is unset", () => {
    expect(isFullAnalysisEnabled(undefined)).toBe(false);
  });

  it("is enabled only when the flag is exactly true", () => {
    expect(isFullAnalysisEnabled("true")).toBe(true);
    expect(isFullAnalysisEnabled("TRUE")).toBe(false);
    expect(isFullAnalysisEnabled("1")).toBe(false);
  });
});
