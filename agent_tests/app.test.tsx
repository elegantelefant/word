// ABOUTME: Tests for App root component — tab routing, settings overlay, providers.
// ABOUTME: Verifies tab switching, settings toggle, and context provider wiring.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { App } from "@/App";
import { useAuthProvider } from "@/hooks/useAuth";

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

vi.mock("@/hooks/useAuth", () => ({
  useAuthProvider: vi.fn(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();

  vi.mocked(useAuthProvider).mockReturnValue({
    token: null,
    user: null,
    tier: "free",
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
});

describe("App", () => {
  it("renders with all tabs and header", () => {
    render(<App />);
    expect(screen.getByText("Elefant")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /History/ })).toBeInTheDocument();
    // Review tab and Review Document button both exist
    expect(screen.getByText("Review Document")).toBeInTheDocument();
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

  it("refetches clauses when returning to the Clauses tab", async () => {
    vi.mocked(useAuthProvider).mockReturnValue({
      token: "tok-123",
      user: null,
      tier: "paid",
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const database = {
      id: "db1",
      name: "Standard Clauses",
      clause_count: 1,
    };

    const initialClause = {
      id: "c1",
      name: "Initial Clause",
      content: "Initial text",
    };

    const refreshedClause = {
      id: "c2",
      name: "Refreshed Clause",
      content: "Updated text",
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ databases: [database] })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ clauses: [initialClause] })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ databases: [database] })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ clauses: [refreshedClause] })),
      );

    render(<App />);
    const navigation = screen.getByRole("navigation");
    fireEvent.click(
      within(navigation).getByRole("button", { name: /^Clauses$/ }),
    );

    await waitFor(() => {
      expect(screen.getByText("Initial Clause")).toBeInTheDocument();
    });

    fireEvent.click(
      within(navigation).getByRole("button", { name: /^Review$/ }),
    );

    fireEvent.click(
      within(navigation).getByRole("button", { name: /^Clauses$/ }),
    );
    await waitFor(() => {
      expect(screen.getByText("Refreshed Clause")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });
});
