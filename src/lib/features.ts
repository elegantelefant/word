// ABOUTME: Build-time feature flag decisions for optional application features.
// ABOUTME: Keeps flag interpretation pure and independently testable.

export function isFullAnalysisEnabled(value: string | undefined): boolean {
  return value === "true";
}
