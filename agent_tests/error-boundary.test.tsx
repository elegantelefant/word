// ABOUTME: Tests for ErrorBoundary — catches render errors, shows fallback, retries.
// ABOUTME: Uses a deliberately crashing child component to trigger the boundary.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

beforeEach(() => {
  vi.restoreAllMocks();
});

function CrashingChild({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) throw new Error("Kaboom!");
  return <div>Child OK</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <CrashingChild shouldCrash={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Child OK")).toBeInTheDocument();
  });

  it("shows error fallback when child throws", () => {
    // Suppress React's console.error for expected error boundary logging
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <CrashingChild shouldCrash={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Kaboom!")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("recovers when Try again is clicked", () => {
    let shouldCrash = true;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary>
        <CrashingChild shouldCrash={shouldCrash} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Fix the crash condition, then click retry
    shouldCrash = false;
    rerender(
      <ErrorBoundary>
        <CrashingChild shouldCrash={shouldCrash} />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByText("Try again"));
    expect(screen.getByText("Child OK")).toBeInTheDocument();

    spy.mockRestore();
  });
});
