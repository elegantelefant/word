// ABOUTME: Component render tests for Layout, UpgradePrompt, and ErrorBoundary.
// ABOUTME: Verifies basic rendering and user interactions.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Layout } from "@/components/Layout";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";

describe("Layout", () => {
  it("renders header and all tab labels", () => {
    render(
      <Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}>
        <div>content</div>
      </Layout>,
    );

    expect(screen.getByText("Elefant")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Clauses")).toBeInTheDocument();
    expect(screen.getByText("Mammoth")).toBeInTheDocument();
    expect(screen.getByText("Analysis")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("calls onTabChange when tab clicked", () => {
    const onChange = vi.fn();
    render(
      <Layout activeTab="review" onTabChange={onChange} onSettingsClick={() => {}}>
        <div />
      </Layout>,
    );

    fireEvent.click(screen.getByText("Clauses"));
    expect(onChange).toHaveBeenCalledWith("clauses");
  });

  it("calls onSettingsClick when gear clicked", () => {
    const onSettings = vi.fn();
    render(
      <Layout activeTab="review" onTabChange={() => {}} onSettingsClick={onSettings}>
        <div />
      </Layout>,
    );

    fireEvent.click(screen.getByLabelText("Settings"));
    expect(onSettings).toHaveBeenCalled();
  });
});

describe("UpgradePrompt", () => {
  it("renders feature name and upgrade link", () => {
    render(<UpgradePrompt feature="Clause Search" />);

    expect(screen.getByText("Clause Search requires Elefant Pro")).toBeInTheDocument();
    expect(screen.getByText("Upgrade to Pro")).toBeInTheDocument();
  });
});

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>child content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("renders fallback when child throws", () => {
    const ThrowingComponent = () => {
      throw new Error("Test error");
    };

    // Suppress console.error for this test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();

    spy.mockRestore();
  });
});
