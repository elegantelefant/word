// ABOUTME: Tests per-feature plan gates in the panels for signed-in accounts (Lite and paid plans).
// ABOUTME: Only fetch (the HTTP boundary) and lib/office (Word) are replaced; panels and the API client are real.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { ClausesPanel } from "@/components/panels/ClausesPanel";
import { Layout } from "@/components/Layout";
import { AuthContext, AUTH_INITIAL, type AuthContextValue } from "@/store/auth";
import { SettingsContext } from "@/store/settings";
import { UpsellContext } from "@/store/upsell";
import { isOfficeReady } from "@/lib/office";
import type { MeResponse } from "@/types/api";

vi.mock("@/lib/office", () => ({
  isOfficeReady: vi.fn(() => true),
  insertText: vi.fn(async () => {}),
  getSelectedText: vi.fn(async () => ""),
}));

const LITE_ME = {
  user: { id: "u1", email: "a@b.com", name: "Lee" },
  org: { id: "o1", name: "Lee", slug: "lee", accountType: "individual" },
  entitlements: { plan: "lite", source: "none", reviewRequestsMonthly: 30, draftRequestsMonthly: 10, clauseSuggestRequestsMonthly: 0, clauseProcessRequestsMonthly: 0 },
} as unknown as MeResponse;

function renderSignedIn(ui: React.ReactNode, user: MeResponse = LITE_ME, upsell = true) {
  const auth: AuthContextValue = { ...AUTH_INITIAL, token: "tok", tier: "paid", user, login: async () => {}, logout: () => {} };
  return render(
    <UpsellContext value={upsell}>
      <SettingsContext value={{ settings: { apiKey: "", model: "gemini-4-hydrogen" }, updateSettings: vi.fn() }}>
        <AuthContext value={auth}>{ui}</AuthContext>
      </SettingsContext>
    </UpsellContext>,
  );
}

const envelope = (status: number, reason: string, message: string) =>
  new Response(JSON.stringify({ statusCode: status, statusMessage: "backend_error", data: { message, detail: { reason } } }), { status });

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(isOfficeReady).mockReturnValue(true);
});

describe("Clauses tab on Lite (#98)", () => {
  it("offers Elefant drafting and never asks for the clause library Lite lacks", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    renderSignedIn(<ClausesPanel />);

    expect(screen.getByRole("button", { name: "Draft clause" })).toBeInTheDocument();
    expect(screen.getByText(/^Clause search comes with Elefant.s paid plans\./)).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes("/clause-databases"))).toBe(false);
  });

  it("adds a quiet See plans link when Lite's drafting allowance is used up", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(envelope(429, "over_plan_quota", "You've used up this period's allowance."));
    renderSignedIn(<ClausesPanel />);

    fireEvent.change(screen.getByLabelText("Draft a clause"), { target: { value: "a payment clause" } });
    fireEvent.click(screen.getByRole("button", { name: "Draft clause" }));

    const line = (await screen.findByText(/^You've used up this period's allowance\./)).closest("p")!;
    expect(within(line).getByRole("link", { name: "See plans" })).toHaveAttribute("href", "https://elefant.legal/pricing");
  });

  it("shows no plans link for an error a plan would not fix", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("boom", { status: 500 }));
    renderSignedIn(<ClausesPanel />);

    fireEvent.change(screen.getByLabelText("Draft a clause"), { target: { value: "a payment clause" } });
    fireEvent.click(screen.getByRole("button", { name: "Draft clause" }));

    const line = await screen.findByText("Something went wrong while contacting Elefant. Please try again.");
    expect(within(line).queryByRole("link")).toBeNull();
  });

  it("drops the plans link where upsell is off", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(envelope(402, "credits_exhausted", "You're out of credits."));
    renderSignedIn(<ClausesPanel />, LITE_ME, false);

    fireEvent.change(screen.getByLabelText("Draft a clause"), { target: { value: "a payment clause" } });
    fireEvent.click(screen.getByRole("button", { name: "Draft clause" }));

    await waitFor(() => expect(screen.getByText("You're out of credits.")).toBeInTheDocument());
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("Footer plan name (#98)", () => {
  it.each([["lite", "Lite"], ["pro", "Pro"], ["business", "Business"], ["academia", "Academia"], ["pilot", "Elefant"]])(
    "names plan %s as %s",
    (plan, label) => {
      const user = { ...LITE_ME, entitlements: { ...LITE_ME.entitlements, plan } } as unknown as MeResponse;
      renderSignedIn(<Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}><div /></Layout>, user);
      expect(screen.getByRole("contentinfo")).toHaveTextContent(label);
    },
  );
});

describe("Review on Lite (#98)", () => {
  it("adds a quiet See plans link when Lite's review allowance is used up", async () => {
    const { ReviewPanel } = await import("@/components/panels/ReviewPanel");
    const { getSelectedText } = await import("@/lib/office");
    vi.mocked(getSelectedText).mockResolvedValue("The Supplier shall deliver the Goods on time.");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(envelope(429, "over_plan_quota", "You've used up this period's allowance."));
    const { UIContext } = await import("@/store/ui");
    renderSignedIn(<UIContext value={{ openSettings: () => {} } as never}><ReviewPanel /></UIContext>);

    fireEvent.click(screen.getByRole("button", { name: "Review Document" }));

    const line = (await screen.findByText(/^You've used up this period's allowance\./)).closest("div")!;
    expect(within(line).getByRole("link", { name: "See plans" })).toHaveAttribute("href", "https://elefant.legal/pricing");
  });
});
