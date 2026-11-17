// ABOUTME: Tests for the Teams review panel, which reviews pasted text because Teams has no document.
// ABOUTME: The review API is stubbed at its boundary; the panel's own decisions run for real.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

function renderPanel(apiKey = "AIza-test", authOverrides: Partial<AuthContextValue> = {}) {
  const settings: SettingsContextValue = {
    settings: { apiKey, model: "gemini-2.5-flash" },
    updateSettings: vi.fn(),
  };
  const auth: AuthContextValue = { ...AUTH_INITIAL, login: async () => {}, logout: () => {}, ...authOverrides };
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

  it("sends a signed-in Pro user's text to Elefant, with no Gemini key needed", async () => {
    const { reviewPaid } = await import("@/api/review");
    vi.mocked(reviewPaid).mockResolvedValue({ summary: "Reviewed by Elefant.", issues: [] });

    renderPanel("", { tier: "paid", token: "pro.jwt.token" });
    fireEvent.change(screen.getByPlaceholderText(/paste the text/i), {
      target: { value: "The Supplier shall indemnify the Customer without limit." },
    });
    fireEvent.click(screen.getByText("Review Text"));

    expect(await screen.findByText("Reviewed by Elefant.")).toBeInTheDocument();
    expect(vi.mocked(reviewPaid).mock.calls[0]?.slice(0, 2)).toEqual([
      "The Supplier shall indemnify the Customer without limit.",
      "pro.jwt.token",
    ]);
  });

  it("asks a Pro user without a session to sign in instead of reviewing", () => {
    renderPanel("AIza-test", { tier: "paid", token: null });
    expect(screen.getByText("Review Text")).toBeDisabled();
    expect(screen.getByText(/sign in to your elefant account/i)).toBeInTheDocument();
  });

  it("keeps a free review in local history but not a Pro one", async () => {
    const { reviewFree, reviewPaid } = await import("@/api/review");
    const { addToLocalHistory } = await import("@/lib/history");
    vi.mocked(reviewFree).mockResolvedValue({ summary: "Free summary.", issues: [] });
    vi.mocked(reviewPaid).mockResolvedValue({ summary: "Pro summary.", issues: [] });
    const text = { target: { value: "The Supplier shall indemnify the Customer without limit." } };

    const free = renderPanel();
    fireEvent.change(screen.getByPlaceholderText(/paste the text/i), text);
    fireEvent.click(screen.getByText("Review Text"));
    await screen.findByText("Free summary.");
    free.unmount();

    renderPanel("", { tier: "paid", token: "pro.jwt.token" });
    fireEvent.change(screen.getByPlaceholderText(/paste the text/i), text);
    fireEvent.click(screen.getByText("Review Text"));
    await screen.findByText("Pro summary.");

    expect(vi.mocked(addToLocalHistory).mock.calls).toEqual([[{ type: "review", summary: "Free summary." }]]);
  });

  it("labels a result as AI-generated and links to where a user can report a problem with it", async () => {
    const { reviewFree } = await import("@/api/review");
    vi.mocked(reviewFree).mockResolvedValue({ summary: "Done.", issues: [] });

    renderPanel();
    fireEvent.change(screen.getByPlaceholderText(/paste the text/i), {
      target: { value: "The Supplier shall indemnify the Customer without limit." },
    });
    fireEvent.click(screen.getByText("Review Text"));

    expect(await screen.findByText(/generated by AI and can be wrong/)).toBeInTheDocument();
    const report = screen.getByRole("link", { name: /Report a problem/ });
    expect(report).toHaveAttribute("href", "https://elefant.legal/resources/support");
    expect(within(report).getByRole("img", { name: "Opens outside Teams" })).toBeInTheDocument();
  });
});
