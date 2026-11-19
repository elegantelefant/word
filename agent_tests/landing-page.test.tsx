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

  it("sends macOS users to the folder steps, not a script macOS will not run (#74)", () => {
    render(<LandingPage />);
    expect(screen.getByText("macOS").closest("a")).toHaveAttribute(
      "href",
      "https://github.com/elegantelefant/word#macos-desktop",
    );
  });

  it("reads as one sentence for desktop users, and says the macOS link opens a new tab", () => {
    const { container } = render(<LandingPage />);
    expect(container.textContent).toContain("Follow the steps for macOS (opens in a new tab), or download the installer for Windows.");
    expect(screen.getByText("macOS").closest("a")).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("offers the Windows installer", () => {
    render(<LandingPage />);
    expect(screen.getByText("Windows").closest("a")).toHaveAttribute(
      "href",
      "/install-windows.bat",
    );
  });
});
