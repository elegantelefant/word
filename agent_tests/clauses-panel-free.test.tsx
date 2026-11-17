// ABOUTME: Tests the Clauses tab for a signed-out user: drafting with their own Gemini key (BYOK).
// ABOUTME: The Word boundary (lib/office) and the BYOK agent call (runDraft) are replaced; the panel is real.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClausesPanel } from "@/components/panels/ClausesPanel";
import { AuthContext, AUTH_INITIAL } from "@/store/auth";
import { SettingsContext } from "@/store/settings";
import { UpsellContext } from "@/store/upsell";
import { insertText, isOfficeReady } from "@/lib/office";
import { runDraft } from "@/lib/agent";

vi.mock("@/lib/office", () => ({
  isOfficeReady: vi.fn(() => true),
  insertText: vi.fn(async () => {}),
  getSelectedText: vi.fn(async () => "The Supplier shall deliver the Goods."),
}));
vi.mock("@/lib/agent", () => ({ runDraft: vi.fn() }));

function renderFree({ apiKey = "AIza-test", upsell = true } = {}) {
  return render(
    <UpsellContext value={upsell}>
      <SettingsContext value={{ settings: { apiKey, model: "gemini-4-hydrogen" }, updateSettings: vi.fn() }}>
        <AuthContext value={{ ...AUTH_INITIAL, login: async () => {}, logout: () => {} }}>
          <ClausesPanel />
        </AuthContext>
      </SettingsContext>
    </UpsellContext>,
  );
}

beforeEach(() => {
  vi.mocked(insertText).mockClear();
  vi.mocked(runDraft).mockReset();
  vi.mocked(isOfficeReady).mockReturnValue(true);
});

describe("ClausesPanel — signed out, own Gemini key", () => {
  it("drafts with the user's key and model and inserts the clause at the cursor", async () => {
    vi.mocked(runDraft).mockResolvedValue("The Buyer shall pay within 30 days.");
    renderFree();

    fireEvent.change(screen.getByLabelText("Draft a clause"), { target: { value: "a payment clause" } });
    fireEvent.click(screen.getByRole("button", { name: "Draft clause" }));

    await waitFor(() => expect(insertText).toHaveBeenCalledWith("The Buyer shall pay within 30 days.", "end"));
    expect(runDraft).toHaveBeenCalledWith("AIza-test", "gemini-4-hydrogen", "a payment clause", "The Supplier shall deliver the Goods.");
    expect(screen.getByText("Inserted at the cursor. Undo with Ctrl+Z (Cmd+Z on Mac).")).toBeInTheDocument();
  });

  it("shows Gemini's error and inserts nothing when drafting fails", async () => {
    vi.mocked(runDraft).mockRejectedValue(new Error("Gemini's usage limit was reached. Try again in a little while."));
    renderFree();

    fireEvent.change(screen.getByLabelText("Draft a clause"), { target: { value: "a payment clause" } });
    fireEvent.click(screen.getByRole("button", { name: "Draft clause" }));

    expect(await screen.findByText("Gemini's usage limit was reached. Try again in a little while.")).toBeInTheDocument();
    expect(insertText).not.toHaveBeenCalled();
  });

  it("asks for a Gemini key instead of drafting when none is set", () => {
    renderFree({ apiKey: "" });
    expect(screen.getByRole("button", { name: "Draft clause" })).toBeDisabled();
    expect(screen.getByText("Add your Gemini API key in Settings to draft.")).toBeInTheDocument();
  });

  it("says once, quietly, that signed-in drafting is better", () => {
    renderFree();
    expect(screen.getByText("Signed-in Elefant drafting uses your clause library and Elefant's models.")).toBeInTheDocument();
  });

  it("drops that line where upsell is off", () => {
    renderFree({ upsell: false });
    expect(screen.queryByText(/Signed-in Elefant drafting/)).toBeNull();
  });
});
