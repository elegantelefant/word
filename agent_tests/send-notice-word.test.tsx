// ABOUTME: Tests that Word's pane tells people where their text goes, the same way Outlook's does.
// ABOUTME: Real App, panels and provider; only lib/office (Word), /me and the BYOK agent call are replaced.

import { webcrypto, createHash } from "node:crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "@/App";
import { FullAnalysisPanel } from "@/components/panels/FullAnalysisPanel";
import { SendNoticeProvider } from "@/components/SendNotice";
import { AuthContext, AUTH_INITIAL } from "@/store/auth";
import { runReview } from "@/lib/agent";

vi.mock("@/lib/office", () => ({
  isOfficeReady: vi.fn(() => true),
  getSelectedText: vi.fn(async () => "The Supplier shall deliver the Goods on time."),
  getDocumentBody: vi.fn(async () => ""),
  insertText: vi.fn(),
  selectText: vi.fn(),
}));

vi.mock("@/lib/agent", () => ({
  runReview: vi.fn(async () => ({ summary: "Delivery is unconditional.", issues: [] })),
  runDraft: vi.fn(),
  runReply: vi.fn(),
}));

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  localStorage.clear();
  // Destination-notice tests start with an acknowledged key; first use has its own proof.
  localStorage.setItem(`elefant_google_notice_ack_${createHash("sha256").update("key").digest("hex")}`, "1");
  localStorage.setItem("elefant_settings", JSON.stringify({ apiKey: "key", model: "gemini-3.8-flash" }));
  vi.mocked(runReview).mockClear();
});

afterEach(() => vi.unstubAllGlobals());

describe("Word review send notice", () => {
  it("asks once before the first free review, naming Google, and sends after Continue", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Review Document" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent(/Google/);
    expect(vi.mocked(runReview)).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Delivery is unconditional.")).toBeInTheDocument();
  });

  it("shows the toast on a later review without asking again", async () => {
    localStorage.setItem("elefant_send_ack_google", "1");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Review Document" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("On its way to Google, with your key"), { timeout: 2000 });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Word full analysis send notice", () => {
  it("asks before sending the text to Elefant", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <AuthContext value={{ ...AUTH_INITIAL, token: "tok", tier: "paid", login: async () => {}, logout: () => {} }}>
        <SendNoticeProvider><FullAnalysisPanel /></SendNoticeProvider>
      </AuthContext>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Run Full Analysis" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent(/Elefant/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
