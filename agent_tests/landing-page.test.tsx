// ABOUTME: Tests for the browser landing page shown outside Office.
// ABOUTME: Covers the explanatory copy and install links; the mount decision
// ABOUTME: is tested separately in mount-decision.test.ts.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingPage } from "@/components/LandingPage";

describe("LandingPage", () => {
  it("explains that the add-in runs inside Word", () => {
    render(<LandingPage />);
    expect(screen.getByText(/needs to run inside Word/i)).toBeInTheDocument();
  });

  it("links to the manifest download", () => {
    render(<LandingPage />);
    const link = screen.getByText("Download manifest.xml").closest("a");
    expect(link).toHaveAttribute("href", "/manifest.xml");
    expect(link).toHaveAttribute("download");
  });

  it("links to Word Online", () => {
    render(<LandingPage />);
    const link = screen.getByText("Word Online").closest("a");
    expect(link).toHaveAttribute("href", "https://word.new");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("offers desktop installers for both platforms", () => {
    render(<LandingPage />);
    expect(screen.getByText("macOS").closest("a")).toHaveAttribute(
      "href",
      "/install-mac.command",
    );
    expect(screen.getByText("Windows").closest("a")).toHaveAttribute(
      "href",
      "/install-windows.bat",
    );
  });
});
