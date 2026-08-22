// ABOUTME: Component render tests for Layout, UpgradePrompt, and ErrorBoundary.
// ABOUTME: Verifies basic rendering and user interactions.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { Layout } from "@/components/Layout";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthContext } from "@/store/auth";

const freeAuth = {
  token: null,
  user: null,
  tier: "free" as const,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

const paidAuth = {
  ...freeAuth,
  token: "test-token",
  tier: "paid" as const,
};

function renderLayout(ui: ReactNode) {
  return render(<AuthContext value={freeAuth}>{ui}</AuthContext>);
}

function renderLayoutPaid(ui: ReactNode) {
  return render(<AuthContext value={paidAuth}>{ui}</AuthContext>);
}

describe("Layout", () => {
  it("renders header and all tab labels", () => {
    renderLayout(
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

  it("renders version and tier in footer", () => {
    renderLayout(
      <Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}>
        <div />
      </Layout>,
    );

    expect(screen.getByText("vtest")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("shows the unlock banner for free tier", () => {
    renderLayout(
      <Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}>
        <div />
      </Layout>,
    );

    expect(screen.getByText("Unlock all features — Sign in")).toBeInTheDocument();
  });

  it("hides the unlock banner for paid tier", () => {
    renderLayoutPaid(
      <Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}>
        <div />
      </Layout>,
    );

    expect(screen.queryByText("Unlock all features — Sign in")).not.toBeInTheDocument();
  });

  it("calls onSettingsClick when the unlock banner is clicked", () => {
    const onSettings = vi.fn();
    renderLayout(
      <Layout activeTab="review" onTabChange={() => {}} onSettingsClick={onSettings}>
        <div />
      </Layout>,
    );

    fireEvent.click(screen.getByText("Unlock all features — Sign in"));
    expect(onSettings).toHaveBeenCalledOnce();
  });

  it("calls onTabChange when free tab clicked", () => {
    const onChange = vi.fn();
    renderLayout(
      <Layout activeTab="review" onTabChange={onChange} onSettingsClick={() => {}}>
        <div />
      </Layout>,
    );

    fireEvent.click(screen.getByText("History"));
    expect(onChange).toHaveBeenCalledWith("history");
  });

  it("disables paid-only tabs for free users", () => {
    const onChange = vi.fn();
    renderLayout(
      <Layout activeTab="review" onTabChange={onChange} onSettingsClick={() => {}}>
        <div />
      </Layout>,
    );

    const clausesBtn = screen.getByRole("button", { name: /Clauses/ });
    expect(clausesBtn).toBeDisabled();
    fireEvent.click(clausesBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls onSettingsClick when gear clicked", () => {
    const onSettings = vi.fn();
    renderLayout(
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
