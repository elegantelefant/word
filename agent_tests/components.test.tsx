// ABOUTME: Component render tests for Layout and ErrorBoundary.
// ABOUTME: Verifies basic rendering and user interactions.

import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { Layout } from "@/components/Layout";
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
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hides the Analysis tab by default", () => {
    renderLayout(
      <Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}>
        <div>content</div>
      </Layout>,
    );

    expect(screen.getByText("Elefant")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Clauses")).toBeInTheDocument();
    expect(screen.getByText("Mammoth")).toBeInTheDocument();
    expect(screen.queryByText("Analysis")).not.toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders the Analysis tab when the feature flag is true", () => {
    vi.stubEnv("VITE_FULL_ANALYSIS", "true");
    renderLayout(
      <Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}>
        <div />
      </Layout>,
    );

    expect(screen.getByText("Analysis")).toBeInTheDocument();
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

  it.each([["signed out", null], ["signed in on Lite", "lite-token"]])(
    "shows no upgrade banner on open for a free user (%s) (#97)",
    (_, token) => {
      render(
        <AuthContext value={{ ...freeAuth, token }}>
          <Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}>
            <div />
          </Layout>
        </AuthContext>,
      );

      expect(screen.queryByText(/Unlock all features|Upgrade/)).not.toBeInTheDocument();
    },
  );

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

  it("opens a paid-only tab for free users, so its panel can say what it needs (#97)", () => {
    const onChange = vi.fn();
    renderLayout(
      <Layout activeTab="review" onTabChange={onChange} onSettingsClick={() => {}}>
        <div />
      </Layout>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Clauses/ }));
    expect(onChange).toHaveBeenCalledWith("clauses");
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

  it("keeps Settings out of the header, whose top-right corner Office for Mac covers with its info button (#116)", () => {
    renderLayout(
      <Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}>
        <div />
      </Layout>,
    );

    expect(screen.getByRole("contentinfo")).toContainElement(screen.getByRole("button", { name: "Settings" }));
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

describe("Clauses tab for free users (BYOK drafting)", () => {
  it("shows no lock on Clauses, since signed-out users can draft there", () => {
    render(
      <AuthContext value={freeAuth}>
        <Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}>
          <div />
        </Layout>
      </AuthContext>,
    );
    expect(screen.getByRole("button", { name: "Clauses" })).toHaveAccessibleName("Clauses");
  });
});
