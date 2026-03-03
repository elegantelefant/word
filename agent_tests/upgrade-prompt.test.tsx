// ABOUTME: Tests for UpgradePrompt component — feature name, CTA link.
// ABOUTME: Verifies the paywall displays correctly for any feature name.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UpgradePrompt } from "@/components/UpgradePrompt";

describe("UpgradePrompt", () => {
  it("displays the feature name in heading", () => {
    render(<UpgradePrompt feature="Clause Search" />);
    expect(screen.getByText("Clause Search requires Elefant Pro")).toBeInTheDocument();
  });

  it("displays the feature name lowercased in body text", () => {
    render(<UpgradePrompt feature="Mammoth" />);
    expect(screen.getByText(/access mammoth/)).toBeInTheDocument();
  });

  it("links to pricing page", () => {
    render(<UpgradePrompt feature="Analysis" />);
    const link = screen.getByText("Upgrade to Pro");
    expect(link).toHaveAttribute("href", "https://elefant.legal/pricing");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
