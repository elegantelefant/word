// ABOUTME: Tests for FullAnalysisPanel — parallel review + research jobs.
// ABOUTME: Verifies upgrade prompt, scope toggle, job dispatch, results, error states.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FullAnalysisPanel } from "@/components/panels/FullAnalysisPanel";
import { AuthContext, type AuthContextValue } from "@/store/auth";
import { AUTH_INITIAL } from "@/store/auth";

vi.mock("@/lib/office", () => ({
  isOfficeReady: vi.fn(() => false),
  getSelectedText: vi.fn(),
  getDocumentBody: vi.fn(),
}));

vi.mock("@/lib/polling", () => ({
  pollForResult: vi.fn(),
}));

const noop = () => {};
const noopAsync = async () => {};

function renderWithAuth(overrides: Partial<AuthContextValue> = {}) {
  const auth: AuthContextValue = {
    ...AUTH_INITIAL,
    login: noopAsync,
    logout: noop,
    ...overrides,
  };
  return render(
    <AuthContext value={auth}>
      <FullAnalysisPanel />
    </AuthContext>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("FullAnalysisPanel — free tier", () => {
  it("shows upgrade prompt", () => {
    renderWithAuth();
    expect(screen.getByText("Full Analysis requires Elefant Pro")).toBeInTheDocument();
  });
});

describe("FullAnalysisPanel — paid tier", () => {
  const paidAuth: Partial<AuthContextValue> = { tier: "paid", token: "tok-123" };

  it("renders scope toggle and analyze button", () => {
    renderWithAuth(paidAuth);

    expect(screen.getByText("Selection")).toBeInTheDocument();
    expect(screen.getByText("Full Document")).toBeInTheDocument();
    expect(screen.getByText("Run Full Analysis")).toBeInTheDocument();
  });

  it("shows error when text too short", async () => {
    renderWithAuth(paidAuth);
    fireEvent.click(screen.getByText("Run Full Analysis"));

    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/)).toBeInTheDocument();
    });
  });

  it("runs parallel jobs and displays review result", async () => {
    const { isOfficeReady, getSelectedText } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getSelectedText).mockResolvedValue("This is a legal contract with multiple clauses for analysis.");

    // POST /review and POST /research
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: "j-review" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: "j-research" })));

    const { pollForResult } = await import("@/lib/polling");
    vi.mocked(pollForResult)
      .mockResolvedValueOnce({
        id: "j-review", status: "completed",
        result: { summary: "Contract has risks.", issues: [{ message: "Issue 1", kind: "risk" }] },
      })
      .mockResolvedValueOnce({
        id: "j-research", status: "completed",
        result: { report: "Detailed research findings here." },
      });

    renderWithAuth(paidAuth);
    fireEvent.click(screen.getByText("Run Full Analysis"));

    expect(screen.getByText("Analyzing...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Contract has risks.")).toBeInTheDocument();
    });
    expect(screen.getByText("1 issue(s) found")).toBeInTheDocument();
    expect(screen.getByText("Detailed research findings here.")).toBeInTheDocument();
  });

  it("handles research endpoint 404 gracefully", async () => {
    const { isOfficeReady, getSelectedText } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getSelectedText).mockResolvedValue("Enough text for the analysis to proceed without issue.");

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: "j-review" })))
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }));  // research 404

    const { pollForResult } = await import("@/lib/polling");
    vi.mocked(pollForResult)
      .mockResolvedValueOnce({
        id: "j-review", status: "completed",
        result: { summary: "Review only result." },
      });

    renderWithAuth(paidAuth);
    fireEvent.click(screen.getByText("Run Full Analysis"));

    await waitFor(() => {
      expect(screen.getByText("Review only result.")).toBeInTheDocument();
    });
    // Research section should not appear
    expect(screen.queryByText("Research Report")).not.toBeInTheDocument();
  });

  it("shows error when review job fails", async () => {
    const { isOfficeReady, getSelectedText } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getSelectedText).mockResolvedValue("Enough text for the analysis to be attempted here.");

    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Network error"));

    renderWithAuth(paidAuth);
    fireEvent.click(screen.getByText("Run Full Analysis"));

    await waitFor(() => {
      expect(screen.getByText(/Network request failed/)).toBeInTheDocument();
    });
  });

  it("toggles scope to full document", async () => {
    const { isOfficeReady, getDocumentBody } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getDocumentBody).mockResolvedValue("Full document body text for comprehensive analysis here.");

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: "j1" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: "j2" })));

    const { pollForResult } = await import("@/lib/polling");
    vi.mocked(pollForResult)
      .mockResolvedValueOnce({ id: "j1", status: "completed", result: { summary: "Full doc review." } })
      .mockResolvedValueOnce({ id: "j2", status: "completed", result: { report: "Full report." } });

    renderWithAuth(paidAuth);
    fireEvent.click(screen.getByText("Full Document"));
    fireEvent.click(screen.getByText("Run Full Analysis"));

    await waitFor(() => {
      expect(screen.getByText("Full doc review.")).toBeInTheDocument();
    });
    expect(getDocumentBody).toHaveBeenCalled();
  });
});
