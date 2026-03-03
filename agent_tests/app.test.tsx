// ABOUTME: Tests for App root component — tab routing, settings overlay, providers.
// ABOUTME: Verifies tab switching, settings toggle, and context provider wiring.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
    expect(screen.getByText("Clauses")).toBeInTheDocument();
    expect(screen.getByText("Mammoth")).toBeInTheDocument();
    expect(screen.getByText("Analysis")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    // Review tab and Review button both exist
    expect(screen.getAllByText("Review")).toHaveLength(2);
  });

  it("switches to Clauses tab", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Clauses"));
    // Free tier sees upgrade prompt
    expect(screen.getByText("Clause Search requires Elefant Pro")).toBeInTheDocument();
  });

  it("switches to Mammoth tab", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Mammoth"));
    expect(screen.getByText("Mammoth requires Elefant Pro")).toBeInTheDocument();
  });

  it("switches to Analysis tab", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Analysis"));
    expect(screen.getByText("Full Analysis requires Elefant Pro")).toBeInTheDocument();
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
