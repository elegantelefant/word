// ABOUTME: Tests the Citations tab: gated from /me limits, plain status words, and showing a citation in Word.
// ABOUTME: Only fetch (real proxy body shape) and lib/office (Word) are replaced; panel, client and poller are real.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CitationsPanel } from "@/components/panels/CitationsPanel";
import { AuthContext, AUTH_INITIAL, type AuthContextValue } from "@/store/auth";
import { UpsellContext } from "@/store/upsell";
import { getDocumentBody, selectText } from "@/lib/office";
import type { MeResponse } from "@/types/api";

vi.mock("@/lib/office", () => ({
  isOfficeReady: vi.fn(() => true),
  getSelectedText: vi.fn(async () => ""),
  getDocumentBody: vi.fn(async () => "As held in [2020] SGCA 1 and [2031] SGHC 999, the term is implied."),
  selectText: vi.fn(async () => true),
}));

const meWith = (citationChecksMonthly: number) =>
  ({ user: { id: "u", email: "e", name: "n" }, org: null, entitlements: { plan: "pro", citationChecksMonthly, citationChecksDaily: citationChecksMonthly ? 12 : 0 } }) as unknown as MeResponse;

function renderPanel({ signedIn = true, user = meWith(60), upsell = true } = {}) {
  const auth: AuthContextValue = signedIn
    ? { ...AUTH_INITIAL, token: "tok", tier: "paid", user, login: async () => {}, logout: () => {} }
    : { ...AUTH_INITIAL, login: async () => {}, logout: () => {} };
  return render(<UpsellContext value={upsell}><AuthContext value={auth}><CitationsPanel /></AuthContext></UpsellContext>);
}

const jobFlow = (results: unknown[]) =>
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: "c1", pollUrl: "/jobs/c1", status: "queued" })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: "c1", type: "citation_check", status: "completed", createdAt: "2026-11-17" })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: "c1", status: "completed", result: { jobType: "citation_check", total: results.length, results } })));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(selectText).mockResolvedValue(true);
  vi.mocked(getDocumentBody).mockResolvedValue("As held in [2020] SGCA 1 and [2031] SGHC 999, the term is implied.");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("CitationsPanel (#106)", () => {
  it("asks a signed-out user to sign in, quietly", () => {
    const { container } = renderPanel({ signedIn: false });
    expect(container.textContent).toBe("Citation checking needs an Elefant account. Sign in from Settings.");
  });

  it("tells a plan without citation checks, quietly, and calls nothing", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderPanel({ user: meWith(0) });
    expect(screen.getByText(/^Citation checking isn't included in your plan\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check citations" })).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("checks the document's citations and labels each in plain words, never 'verified'", async () => {
    jobFlow([
      { citation: "[2020] SGCA 1", status: "verified" },
      { citation: "[2031] SGHC 999", status: "hallucinated" },
      { citation: "s 2 Evidence Act", status: "mismatch" },
      { citation: "Re X", status: "uncertain" },
    ]);
    const { container } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));

    expect(await screen.findByText("Checked 4 citations: Found 1, Doesn't match 1, Not found 1, Unsure 1.")).toBeInTheDocument();
    for (const [citation, label] of [["[2020] SGCA 1", "Found"], ["[2031] SGHC 999", "Not found"], ["s 2 Evidence Act", "Doesn't match"], ["Re X", "Unsure"]]) {
      expect(within(screen.getByText(citation).closest("li")!).getByText(label)).toBeInTheDocument();
    }
    expect(container.textContent).not.toMatch(/verif|certif/i);
  });

  it("shows a citation in the document, or says it isn't there", async () => {
    jobFlow([{ citation: "[2020] SGCA 1", status: "verified" }]);
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));
    await screen.findByText("[2020] SGCA 1");

    fireEvent.click(screen.getByRole("button", { name: "Show [2020] SGCA 1 in the document" }));
    expect(selectText).toHaveBeenCalledWith("[2020] SGCA 1");

    vi.mocked(selectText).mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Show [2020] SGCA 1 in the document" }));
    expect(await screen.findByText("Couldn't find this citation in the document.")).toBeInTheDocument();
  });

  it("says when there is nothing to check", async () => {
    vi.mocked(getDocumentBody).mockResolvedValue("   ");
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));
    expect(await screen.findByText("This document doesn't have any text to check.")).toBeInTheDocument();
  });

  it("adds See plans after a plan refusal, and not where upsell is off", async () => {
    const refusal = () => new Response(JSON.stringify({
      error: true, url: "https://elefant.legal/api/v4/api/v1/citations/check", statusCode: 403, statusMessage: "backend_error", message: "backend_error",
      data: { error: true, code: "FORBIDDEN", message: "This isn't included in your current plan. Upgrade to turn it on.", detail: { reason: "feature_disabled", product: "citations" } },
    }), { status: 403 });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(refusal());
    const { unmount } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));
    const line = (await screen.findByText(/^This isn't included in your current plan\./)).closest("p")!;
    expect(within(line).getByRole("link", { name: "See plans" })).toHaveAttribute("href", "https://elefant.legal/pricing");
    unmount();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(refusal());
    renderPanel({ upsell: false });
    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));
    await screen.findByText(/^This isn't included in your current plan\./);
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("CitationsPanel edge cases (#106)", () => {
  it("says so when the text has no citations, and reads one citation in the singular", async () => {
    jobFlow([]);
    const { unmount } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));
    expect(await screen.findByText("No citations found in the text.")).toBeInTheDocument();
    unmount();

    jobFlow([{ citation: "Re X", status: "uncertain" }]);
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));
    expect(await screen.findByText("Checked 1 citation: Found 0, Doesn't match 0, Not found 0, Unsure 1.")).toBeInTheDocument();
  });

  it("checks the selected text when there is one", async () => {
    const { getSelectedText } = await import("@/lib/office");
    vi.mocked(getSelectedText).mockResolvedValueOnce("Only [2020] SGCA 1 here.");
    const fetchSpy = jobFlow([]);
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));
    await screen.findByText("No citations found in the text.");
    expect(JSON.parse(String(fetchSpy.mock.calls[0]![1]?.body))).toEqual({ text: "Only [2020] SGCA 1 here." });
  });

  it("links a source only when it is a web address", async () => {
    jobFlow([
      { citation: "A", status: "verified", sourceUrl: "https://elefant.legal/c/1" },
      { citation: "B", status: "verified", sourceUrl: "javascript:alert(1)" },
    ]);
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));
    await screen.findByText("A");
    expect(screen.getByRole("link", { name: "Source for A" })).toHaveAttribute("href", "https://elefant.legal/c/1");
    expect(screen.queryByRole("link", { name: "Source for B" })).toBeNull();
  });

  it("shows no plans link for an error a plan would not fix", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("boom", { status: 500 }));
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));
    const line = await screen.findByText("Something went wrong while contacting Elefant. Please try again.");
    expect(within(line).queryByRole("link")).toBeNull();
  });
});

describe("CitationsPanel robustness (#106)", () => {
  it("stops a running check when the add-in closes, and shows no error", async () => {
    let seenSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      seenSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    });
    const { unmount } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));
    await vi.waitFor(() => expect(seenSignal).toBeDefined());

    unmount();

    expect(seenSignal!.aborted).toBe(true);
  });

  it("falls back to the whole document when the selection is only whitespace", async () => {
    const { getSelectedText } = await import("@/lib/office");
    vi.mocked(getSelectedText).mockResolvedValueOnce("  \n ");
    const fetchSpy = jobFlow([]);
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));
    await screen.findByText("No citations found in the text.");
    expect(JSON.parse(String(fetchSpy.mock.calls[0]![1]?.body)).text).toMatch(/^As held in/);
  });

  it("says a citation could not be shown when Word refuses the search", async () => {
    jobFlow([{ citation: "[2020] SGCA 1", status: "verified" }]);
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));
    await screen.findByText("[2020] SGCA 1");
    vi.mocked(selectText).mockRejectedValueOnce(new Error("GeneralException"));

    fireEvent.click(screen.getByRole("button", { name: "Show [2020] SGCA 1 in the document" }));

    expect(await screen.findByText("Couldn't find this citation in the document.")).toBeInTheDocument();
  });

  it("says checking needs Word when the pane runs outside Word", async () => {
    const { isOfficeReady } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValueOnce(false);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));
    expect(await screen.findByText("Checking citations needs Microsoft Word: open Elefant from the Word ribbon.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
