// ABOUTME: Tests for ReviewPanel component — the core user-facing review flow.
// ABOUTME: Covers rendering, scope toggle, review execution, results display, error states.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReviewPanel } from "@/components/panels/ReviewPanel";
import { SettingsContext, type SettingsContextValue } from "@/store/settings";
import { AuthContext, type AuthContextValue } from "@/store/auth";
import { AUTH_INITIAL } from "@/store/auth";

// Mock modules
vi.mock("@/api/review", () => ({
  reviewFree: vi.fn(),
  reviewPaid: vi.fn(),
}));

vi.mock("@/lib/office", () => ({
  isOfficeReady: vi.fn(() => false),
  getSelectedText: vi.fn(),
  getDocumentBody: vi.fn(),
  insertText: vi.fn(),
}));

vi.mock("@/components/panels/HistoryPanel", () => ({
  addToLocalHistory: vi.fn(),
}));

const noop = () => {};
const noopAsync = async () => {};

function renderPanel(
  settingsOverrides: Partial<SettingsContextValue> = {},
  authOverrides: Partial<AuthContextValue> = {},
) {
  const settings: SettingsContextValue = {
    settings: { apiKey: "AIza-test", model: "gemini-2.5-flash" },
    updateSettings: vi.fn(),
    ...settingsOverrides,
  };

  const auth: AuthContextValue = {
    ...AUTH_INITIAL,
    login: noopAsync,
    logout: noop,
    ...authOverrides,
  };

  return render(
    <SettingsContext value={settings}>
      <AuthContext value={auth}>
        <ReviewPanel />
      </AuthContext>
    </SettingsContext>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ReviewPanel — rendering", () => {
  it("renders scope selector, instructions, and review button", () => {
    renderPanel();

    expect(screen.getByText("Selection")).toBeInTheDocument();
    expect(screen.getByText("Full Document")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/review instructions/i)).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("disables review button when no API key (free tier)", () => {
    renderPanel({ settings: { apiKey: "", model: "gemini-2.5-flash" } });

    expect(screen.getByText("Review")).toBeDisabled();
    expect(screen.getByText(/enter your gemini api key/i)).toBeInTheDocument();
  });

  it("disables review button when no token (paid tier)", () => {
    renderPanel({}, { tier: "paid", token: null });

    expect(screen.getByText("Review")).toBeDisabled();
    expect(screen.getByText(/sign in to review/i)).toBeInTheDocument();
  });

  it("enables review button when API key is set (free tier)", () => {
    renderPanel();
    expect(screen.getByText("Review")).not.toBeDisabled();
  });

  it("enables review button when token is set (paid tier)", () => {
    renderPanel({}, { tier: "paid", token: "tok-123" });
    expect(screen.getByText("Review")).not.toBeDisabled();
  });
});

describe("ReviewPanel — scope toggle", () => {
  it("defaults to selection scope", () => {
    renderPanel();
    const btn = screen.getByText("Selection");
    expect(btn.className).toContain("bg-blue-100");
  });

  it("switches to full document scope", () => {
    renderPanel();
    fireEvent.click(screen.getByText("Full Document"));
    expect(screen.getByText("Full Document").className).toContain("bg-blue-100");
    expect(screen.getByText("Selection").className).not.toContain("bg-blue-100");
  });
});

describe("ReviewPanel — free-tier review", () => {
  it("shows error when text too short (Office not ready)", async () => {
    renderPanel();
    fireEvent.click(screen.getByText("Review"));

    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/)).toBeInTheDocument();
    });
  });

  it("calls reviewFree and displays results", async () => {
    const { isOfficeReady, getSelectedText } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getSelectedText).mockResolvedValue("This is a legal contract clause that should be reviewed.");

    const { reviewFree } = await import("@/api/review");
    vi.mocked(reviewFree).mockResolvedValue({
      summary: "Generally well-drafted contract.",
      issues: [
        { message: "Ambiguous termination clause", kind: "ambiguity", location: "Section 3.1", suggestion: "Add 30-day notice period" },
        { message: "Missing force majeure", kind: "missing" },
      ],
    });

    renderPanel();
    fireEvent.click(screen.getByText("Review"));

    // Should show loading state
    expect(screen.getByText("Reviewing...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Generally well-drafted contract.")).toBeInTheDocument();
    });

    // Check issues rendered
    expect(screen.getByText("Ambiguous termination clause")).toBeInTheDocument();
    expect(screen.getByText("ambiguity")).toBeInTheDocument();
    expect(screen.getByText("Missing force majeure")).toBeInTheDocument();
    expect(screen.getByText("missing")).toBeInTheDocument();

    // Check location and suggestion
    expect(screen.getByText(/"Section 3.1"/)).toBeInTheDocument();
    expect(screen.getByText("Add 30-day notice period")).toBeInTheDocument();
    expect(screen.getByText("Insert")).toBeInTheDocument();

    // Check issues count header
    expect(screen.getByText("Issues (2)")).toBeInTheDocument();
  });

  it("saves to local history on free-tier review", async () => {
    const { isOfficeReady, getSelectedText } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getSelectedText).mockResolvedValue("Sufficient text for review");

    const { reviewFree } = await import("@/api/review");
    vi.mocked(reviewFree).mockResolvedValue({ summary: "Looks good.", issues: [] });

    const { addToLocalHistory } = await import("@/components/panels/HistoryPanel");

    renderPanel();
    fireEvent.click(screen.getByText("Review"));

    await waitFor(() => {
      expect(screen.getByText("Looks good.")).toBeInTheDocument();
    });

    expect(addToLocalHistory).toHaveBeenCalledWith({ type: "review", summary: "Looks good." });
  });

  it("uses full document text when document scope selected", async () => {
    const { isOfficeReady, getDocumentBody } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getDocumentBody).mockResolvedValue("Full document body text here");

    const { reviewFree } = await import("@/api/review");
    vi.mocked(reviewFree).mockResolvedValue({ summary: "ok", issues: [] });

    renderPanel();
    fireEvent.click(screen.getByText("Full Document"));
    fireEvent.click(screen.getByText("Review"));

    await waitFor(() => {
      expect(reviewFree).toHaveBeenCalledWith("Full document body text here", "AIza-test", "gemini-2.5-flash", undefined);
    });
  });
});

describe("ReviewPanel — paid-tier review", () => {
  it("calls reviewPaid when authenticated", async () => {
    const { isOfficeReady, getSelectedText } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getSelectedText).mockResolvedValue("Contract text for paid review");

    const { reviewPaid } = await import("@/api/review");
    vi.mocked(reviewPaid).mockResolvedValue({ summary: "Reviewed via API.", issues: [] });

    renderPanel({}, { tier: "paid", token: "tok-123" });
    fireEvent.click(screen.getByText("Review"));

    await waitFor(() => {
      expect(reviewPaid).toHaveBeenCalledWith("Contract text for paid review", "tok-123", undefined);
    });
  });
});

describe("ReviewPanel — error handling", () => {
  it("displays review errors", async () => {
    const { isOfficeReady, getSelectedText } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getSelectedText).mockResolvedValue("Enough text for a review attempt");

    const { reviewFree } = await import("@/api/review");
    vi.mocked(reviewFree).mockRejectedValue(new Error("API key invalid"));

    renderPanel();
    fireEvent.click(screen.getByText("Review"));

    await waitFor(() => {
      expect(screen.getByText("API key invalid")).toBeInTheDocument();
    });

    // Button should be re-enabled after error
    expect(screen.getByText("Review")).not.toBeDisabled();
  });
});

describe("ReviewPanel — issue cards", () => {
  it("renders issue without location or suggestion", async () => {
    const { isOfficeReady, getSelectedText } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getSelectedText).mockResolvedValue("Text to review for issues");

    const { reviewFree } = await import("@/api/review");
    vi.mocked(reviewFree).mockResolvedValue({
      summary: "Issues found.",
      issues: [{ message: "Plain issue, no extras", kind: "other" }],
    });

    renderPanel();
    fireEvent.click(screen.getByText("Review"));

    await waitFor(() => {
      expect(screen.getByText("Plain issue, no extras")).toBeInTheDocument();
    });

    expect(screen.getByText("other")).toBeInTheDocument();
    expect(screen.queryByText("Insert")).not.toBeInTheDocument();
  });

  it("defaults kind to 'other' when missing", async () => {
    const { isOfficeReady, getSelectedText } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getSelectedText).mockResolvedValue("Text for review with unkinded issue");

    const { reviewFree } = await import("@/api/review");
    vi.mocked(reviewFree).mockResolvedValue({
      summary: "Found issue.",
      issues: [{ message: "No kind set" }],
    });

    renderPanel();
    fireEvent.click(screen.getByText("Review"));

    await waitFor(() => {
      expect(screen.getByText("No kind set")).toBeInTheDocument();
    });

    expect(screen.getByText("other")).toBeInTheDocument();
  });
});
