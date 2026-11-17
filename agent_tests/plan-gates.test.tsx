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

// The proxy's relayed refusal, as client-logic.test.ts pins it: Nitro's top-level message is "backend_error".
const envelope = (status: number, reason: string, message: string) =>
  new Response(JSON.stringify({
    error: true, url: "https://elefant.legal/api/v4/api/v1/draft", statusCode: status,
    statusMessage: "backend_error", message: "backend_error",
    data: { error: true, upstream_status: status, code: "QUOTA_EXCEEDED", message, path: "/api/v1/draft", detail: { reason } },
  }), { status });

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(isOfficeReady).mockReturnValue(true);
  // apiFetch logs every refusal; these tests expect refusals, so the log is captured, not printed.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Clauses tab on Lite (#98)", () => {
  it("offers Elefant drafting and never asks for the clause library Lite lacks", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    renderSignedIn(<ClausesPanel />);

    expect(screen.getByRole("button", { name: "Draft clause" })).toBeInTheDocument();
    expect(screen.getByText(/^Clause search isn't included in your plan\./)).toBeInTheDocument();
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

describe("More plan gates (#98)", () => {
  const withLimits = (extra: Record<string, unknown>) =>
    ({ ...LITE_ME, entitlements: { ...LITE_ME.entitlements, ...extra } }) as unknown as MeResponse;

  it("without Mammoth, keeps lodged matters readable, hides lodging, and shows the Mammoth team's message, not a pricing link", async () => {
    const { MammothPanel } = await import("@/components/panels/MammothPanel");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      requests: [{ id: "r1", requestType: "review", status: "completed", priority: "normal", title: "Earlier matter", createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z" }],
      total: 1,
    })));
    renderSignedIn(<MammothPanel />, withLimits({ mammothAccess: 0 }));

    expect(screen.getByText("Mammoth deep research isn't switched on for your organisation yet. Email ping@elefant.legal with your organisation name and we'll enable it.")).toBeInTheDocument();
    expect(await screen.findByText("Earlier matter")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ New" })).toBeNull();
    expect(screen.queryByRole("link", { name: /plans/i })).toBeNull();
  });

  it("keeps the lock on the Mammoth tab for a plan without Mammoth", () => {
    renderSignedIn(<Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}><div /></Layout>, withLimits({ mammothAccess: 0 }));
    expect(screen.getByRole("button", { name: /Mammoth/ })).toHaveAccessibleName("Mammoth, not switched on for your organisation");
  });

  it("offers no Draft button to a plan whose drafting limit is 0", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    renderSignedIn(<ClausesPanel />, withLimits({ draftRequestsMonthly: 0, draftRequestsDaily: 0 }));
    expect(screen.queryByRole("button", { name: "Draft clause" })).toBeNull();
    expect(screen.getByText(/^Drafting isn't included in your plan\./)).toBeInTheDocument();
  });

  it("loads the clause library for a plan that includes it", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ databases: [] })));
    renderSignedIn(<ClausesPanel />, withLimits({ clauseSuggestRequestsMonthly: 50, clauseSuggestRequestsDaily: 10 }));
    await waitFor(() => expect(fetchSpy.mock.calls.some(([url]) => String(url).endsWith("/clause-databases"))).toBe(true));
  });

  it("drops a plans link from an earlier refusal when the next attempt fails for another reason", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(envelope(402, "credits_exhausted", "You're out of credits."))
      .mockResolvedValueOnce(new Response("boom", { status: 500 }));
    renderSignedIn(<ClausesPanel />);
    fireEvent.change(screen.getByLabelText("Draft a clause"), { target: { value: "a payment clause" } });

    fireEvent.click(screen.getByRole("button", { name: "Draft clause" }));
    const first = (await screen.findByText(/^You're out of credits\./)).closest("p")!;
    expect(within(first).getByRole("link", { name: "See plans" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Draft clause" }));
    const second = await screen.findByText("Something went wrong while contacting Elefant. Please try again.");
    expect(within(second).queryByRole("link")).toBeNull();
  });
});

describe("Footer plan name (#98)", () => {
  it.each([["individual", "Lite"], ["personal", "Lite"], ["commercial", "Pro"], ["educational", "Academia"]])(
    "names a fresh account with no plan yet from its profile %s as %s",
    (accountType, label) => {
      const user = { ...LITE_ME, org: { ...LITE_ME.org!, accountType }, entitlements: { ...LITE_ME.entitlements, plan: null } } as unknown as MeResponse;
      renderSignedIn(<Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}><div /></Layout>, user);
      expect(screen.getByRole("contentinfo")).toHaveTextContent(label);
    },
  );

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

describe("Review plans link with upsell off (#98)", () => {
  it("shows the refusal without a plans link", async () => {
    const { ReviewPanel } = await import("@/components/panels/ReviewPanel");
    const { getSelectedText } = await import("@/lib/office");
    vi.mocked(getSelectedText).mockResolvedValue("The Supplier shall deliver the Goods on time.");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(envelope(403, "feature_disabled", "This isn't included in your current plan. Upgrade to turn it on."));
    const { UIContext } = await import("@/store/ui");
    renderSignedIn(<UIContext value={{ openSettings: () => {} } as never}><ReviewPanel /></UIContext>, LITE_ME, false);

    fireEvent.click(screen.getByRole("button", { name: "Review Document" }));

    await screen.findByText(/^This isn't included in your current plan\./);
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("Citations tab (#106)", () => {
  it("is in the tab bar and locked for a plan without citation checks", () => {
    const user = { ...LITE_ME, entitlements: { ...LITE_ME.entitlements, citationChecksMonthly: 0, citationChecksDaily: 0 } } as unknown as MeResponse;
    renderSignedIn(<Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}><div /></Layout>, user);
    expect(screen.getByRole("button", { name: /Citations/ })).toHaveAccessibleName("Citations, needs a paid plan");
  });

  it("is unlocked for a plan with citation checks", () => {
    const user = { ...LITE_ME, entitlements: { ...LITE_ME.entitlements, citationChecksMonthly: 60, citationChecksDaily: 12 } } as unknown as MeResponse;
    renderSignedIn(<Layout activeTab="review" onTabChange={() => {}} onSettingsClick={() => {}}><div /></Layout>, user);
    expect(screen.getByRole("button", { name: /Citations/ })).toHaveAccessibleName("Citations");
  });
});
