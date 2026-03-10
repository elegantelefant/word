// ABOUTME: Tests for App root component — tab routing, settings overlay, providers.
// ABOUTME: Verifies tab switching, settings toggle, and context provider wiring.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { App } from "@/App";

vi.mock("@/api/account", () => ({
  getMe: vi.fn(),
}));

vi.mock("@/api/auth", () => ({
  getSavedToken: vi.fn(() => null),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
  openLoginDialog: vi.fn(),
}));

vi.mock("@/lib/office", () => ({
  isOfficeReady: vi.fn(() => false),
  getSelectedText: vi.fn(),
  getDocumentBody: vi.fn(),
  insertText: vi.fn(),
}));

vi.mock("@/lib/polling", () => ({
  pollForResult: vi.fn(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("App", () => {
  it("renders with all tabs and header", () => {
    render(<App />);
    expect(screen.getByText("Elefant")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /History/ })).toBeInTheDocument();
    // Review tab and Review button both exist
    expect(screen.getAllByText("Review")).toHaveLength(2);
  });

  it("disables paid-only tabs for free tier", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /Clauses/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Mammoth/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Analysis/ })).toBeDisabled();
  });

  it("keeps free tabs enabled", () => {
    render(<App />);
    const nav = screen.getByRole("navigation");
    const historyTab = within(nav).getByRole("button", { name: /History/ });
    const reviewTab = within(nav).getByRole("button", { name: /Review/ });
    expect(reviewTab).toBeEnabled();
    expect(historyTab).toBeEnabled();
  });

  it("switches to History tab", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /History/ }));
    expect(screen.getByText(/review history/i)).toBeInTheDocument();
  });

  it("opens and closes settings panel", () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText("Settings"));
    // Settings panel visible — shows API key section for free tier
    expect(screen.getByPlaceholderText("AIza...")).toBeInTheDocument();

    // Close settings via aria-label button
    fireEvent.click(screen.getByLabelText("Close"));
    // Back to main layout — tab bar visible
    expect(screen.getByText("Clauses")).toBeInTheDocument();
  });
});
