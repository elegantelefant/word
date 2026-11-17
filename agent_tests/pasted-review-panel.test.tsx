// ABOUTME: Tests for the Teams review panel, which reviews pasted text because Teams has no document.
// ABOUTME: The review API is stubbed at its boundary; the panel's own decisions run for real.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PastedReviewPanel } from "@/components/panels/PastedReviewPanel";
import { SettingsContext, type SettingsContextValue } from "@/store/settings";
import { AuthContext, AUTH_INITIAL, type AuthContextValue } from "@/store/auth";
import { UIContext } from "@/store/ui";

vi.mock("@/api/review", () => ({
  reviewFree: vi.fn(),
  reviewPaid: vi.fn(),
}));

vi.mock("@/lib/history", () => ({
  addToLocalHistory: vi.fn(),
}));

function renderPanel(apiKey = "AIza-test") {
  const settings: SettingsContextValue = {
    settings: { apiKey, model: "gemini-2.5-flash" },
    updateSettings: vi.fn(),
  };
  const auth: AuthContextValue = { ...AUTH_INITIAL, login: async () => {}, logout: () => {} };
  return render(
    <SettingsContext value={settings}>
      <AuthContext value={auth}>
        <UIContext value={{ openSettings: vi.fn() }}>
          <PastedReviewPanel />
        </UIContext>
      </AuthContext>
    </SettingsContext>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PastedReviewPanel", () => {
  it("reviews the pasted text and shows the summary", async () => {
    const { reviewFree } = await import("@/api/review");
    vi.mocked(reviewFree).mockResolvedValue({
      summary: "One indemnity is uncapped.",
      issues: [{ kind: "risk", message: "Uncapped indemnity", suggestion: "Cap it at fees paid." }],
    });

    renderPanel();
    fireEvent.change(screen.getByPlaceholderText(/paste the text/i), {
      target: { value: "The Supplier shall indemnify the Customer without limit." },
    });
    fireEvent.click(screen.getByText("Review Text"));

    expect(await screen.findByText("One indemnity is uncapped.")).toBeInTheDocument();
    expect(vi.mocked(reviewFree).mock.calls[0]?.[0]).toBe("The Supplier shall indemnify the Customer without limit.");
  });

  it("asks for at least 10 characters of pasted text", async () => {
    renderPanel();
    fireEvent.change(screen.getByPlaceholderText(/paste the text/i), { target: { value: "short" } });
    fireEvent.click(screen.getByText("Review Text"));

    await waitFor(() => {
      expect(screen.getByText("Paste at least 10 characters to review.")).toBeInTheDocument();
    });
  });

  it("offers no Insert button, because Teams has no document to insert into", async () => {
    const { reviewFree } = await import("@/api/review");
    vi.mocked(reviewFree).mockResolvedValue({
      summary: "Done.",
      issues: [{ kind: "risk", message: "Uncapped indemnity", suggestion: "Cap it at fees paid." }],
    });

    renderPanel();
    fireEvent.change(screen.getByPlaceholderText(/paste the text/i), {
      target: { value: "The Supplier shall indemnify the Customer without limit." },
    });
    fireEvent.click(screen.getByText("Review Text"));

    expect(await screen.findByText("Cap it at fees paid.")).toBeInTheDocument();
    expect(screen.queryByText("Insert")).not.toBeInTheDocument();
  });

  it("points a keyless free user to Settings instead of reviewing", () => {
    renderPanel("");
    expect(screen.getByText("Review Text")).toBeDisabled();
    expect(screen.getByText(/gemini api key/i)).toBeInTheDocument();
  });
});
