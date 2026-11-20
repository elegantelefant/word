// ABOUTME: Tests the Outlook pane: citations and a reply while writing, a thread summary while reading.
// ABOUTME: Only Office.context.mailbox, fetch (the HTTP boundary) and the BYOK agent calls are replaced.

import { webcrypto, createHash } from "node:crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MailPanel } from "@/components/panels/MailPanel";
import { OutlookApp } from "@/OutlookApp";
import { AuthContext, AUTH_INITIAL, type AuthContextValue } from "@/store/auth";
import { SettingsContext, type Settings } from "@/store/settings";
import { HostContext } from "@/store/host";
import { MAIL_HOST } from "@/lib/mailbox";
import { runReply, runReview } from "@/lib/agent";
import type { MeResponse } from "@/types/api";
import { stubMailbox } from "./mailbox-stub";

vi.mock("@/lib/agent", () => ({
  runReply: vi.fn(async () => "Thank you, Thursday suits us."),
  runReview: vi.fn(async () => ({ summary: "Acme asks for signature by Friday.", issues: [] })),
}));

const THREAD = "From: Acme\nPlease sign the NDA by Friday. See [2020] SGCA 1.";

const PRO_ME = { user: { id: "u", email: "e", name: "n" }, org: null, entitlements: { plan: "pro" } } as unknown as MeResponse;
const meWith = (limits: Record<string, number>) =>
  ({ ...PRO_ME, entitlements: { plan: "lite", ...limits } }) as unknown as MeResponse;

function renderPanel({ signedIn = false, user = PRO_ME, apiKey = "" }: { signedIn?: boolean; user?: MeResponse; apiKey?: string } = {}) {
  const auth: AuthContextValue = signedIn
    ? { ...AUTH_INITIAL, token: "tok", tier: "paid", user, login: async () => {}, logout: () => {} }
    : { ...AUTH_INITIAL, login: async () => {}, logout: () => {} };
  const settings: Settings = { apiKey, model: "gemini-3.8-flash" };
  return render(
    <SettingsContext value={{ settings, updateSettings: () => {} }}>
      <AuthContext value={auth}>
        <HostContext value={MAIL_HOST}><MailPanel /></HostContext>
      </AuthContext>
    </SettingsContext>,
  );
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const jobFlow = (result: unknown) =>
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(json({ jobId: "j1", pollUrl: "/jobs/j1", status: "queued" }))
    .mockResolvedValueOnce(json({ id: "j1", type: "job", status: "completed", createdAt: "2026-11-18" }))
    .mockResolvedValueOnce(json({ id: "j1", status: "completed", result }));

const planRefusal = (status: number, reason: string, message: string) =>
  json({ error: true, statusCode: status, statusMessage: "backend_error", message: "backend_error", data: { error: true, message, detail: { reason } } }, status);

const sentBody = (call: number) => JSON.parse(String(vi.mocked(fetch).mock.calls[call]![1]!.body));

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  // These flows start with an acknowledged key; google-notice.test.tsx covers first use.
  vi.stubGlobal("crypto", webcrypto);
  localStorage.setItem(`elefant_google_notice_ack_${createHash("sha256").update("key").digest("hex")}`, "1");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Outlook pane while writing", () => {
  it("asks a signed-out user to sign in for citation checks, quietly", () => {
    stubMailbox({ mode: "compose", body: THREAD });
    renderPanel();
    expect(screen.getByText("Citation checking needs an Elefant account. Sign in from Settings.")).toBeInTheDocument();
  });

  it("offers a reply and no thread summary", () => {
    stubMailbox({ mode: "compose", body: THREAD });
    renderPanel({ apiKey: "key" });
    expect(screen.getByRole("button", { name: "Draft reply" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Summarise this thread" })).toBeNull();
  });

  it("asks for a Gemini key before drafting a reply signed out", () => {
    stubMailbox({ mode: "compose", body: THREAD });
    renderPanel();
    fireEvent.change(screen.getByLabelText("Draft a reply"), { target: { value: "accept" } });
    expect(screen.getByRole("button", { name: "Draft reply" })).toBeDisabled();
    expect(screen.getByText("Add your Gemini API key in Settings to draft.")).toBeInTheDocument();
  });

  it("drafts a reply from the thread with the user's own key and inserts it at the cursor", async () => {
    const { inserted } = stubMailbox({ mode: "compose", body: THREAD });
    renderPanel({ apiKey: "key" });

    fireEvent.change(screen.getByLabelText("Draft a reply"), { target: { value: "accept the deadline" } });
    fireEvent.click(screen.getByRole("button", { name: "Draft reply" }));

    await screen.findByText(/^Inserted at the cursor\./);
    expect(inserted).toEqual(["Thank you, Thursday suits us."]);
    expect(vi.mocked(runReply)).toHaveBeenCalledWith("key", "gemini-3.8-flash", "accept the deadline", THREAD);
  });

  it("checks the citations in the draft through Elefant, with no 'show in document' link", async () => {
    stubMailbox({ mode: "compose", body: THREAD });
    jobFlow({ jobType: "citation_check", total: 1, results: [{ citation: "[2020] SGCA 1", status: "verified" }] });
    renderPanel({ signedIn: true });

    fireEvent.click(screen.getByRole("button", { name: "Check citations" }));

    expect(await screen.findByText("Checked 1 citation: Found 1, Doesn't match 0, Not found 0, Unsure 0.")).toBeInTheDocument();
    expect(sentBody(0)).toEqual({ text: THREAD });
    expect(screen.queryByRole("button", { name: /Show .* in the document/ })).toBeNull();
  });

  it("drafts a reply through Elefant with the thread as context and inserts it", async () => {
    const { inserted } = stubMailbox({ mode: "compose", body: THREAD });
    jobFlow({ jobType: "draft", draft: "We will sign by Friday." });
    renderPanel({ signedIn: true });

    fireEvent.change(screen.getByLabelText("Draft a reply"), { target: { value: "agree" } });
    fireEvent.click(screen.getByRole("button", { name: "Draft reply" }));

    await screen.findByText(/^Inserted at the cursor\./);
    expect(inserted).toEqual(["We will sign by Friday."]);
    const body = sentBody(0);
    expect(body.supplementContext).toBe(THREAD);
    expect(body.prompt).toMatch(/reply to this email thread.*agree$/s);
  });

  it("tells a plan without drafting, quietly", () => {
    stubMailbox({ mode: "compose", body: THREAD });
    renderPanel({ signedIn: true, user: meWith({ draftRequestsMonthly: 0, draftRequestsDaily: 0 }) });
    expect(screen.getByText(/^Drafting isn't included in your plan\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Draft reply" })).toBeNull();
  });
});

describe("Outlook pane while reading", () => {
  it("offers a thread summary and nothing to insert", () => {
    stubMailbox({ mode: "read", body: THREAD });
    renderPanel({ apiKey: "key" });
    expect(screen.getByRole("button", { name: "Summarise this thread" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Draft reply" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Check citations" })).toBeNull();
  });

  it("asks for a Gemini key before summarising signed out", () => {
    stubMailbox({ mode: "read", body: THREAD });
    renderPanel();
    expect(screen.getByRole("button", { name: "Summarise this thread" })).toBeDisabled();
    expect(screen.getByText("Add your Gemini API key in Settings to summarise.")).toBeInTheDocument();
  });

  it("summarises the thread with the user's own key", async () => {
    stubMailbox({ mode: "read", body: THREAD });
    renderPanel({ apiKey: "key" });

    fireEvent.click(screen.getByRole("button", { name: "Summarise this thread" }));

    expect(await screen.findByText("Acme asks for signature by Friday.")).toBeInTheDocument();
    expect(vi.mocked(runReview).mock.calls[0]![2]).toBe(THREAD);
  });

  it("summarises the thread through Elefant when signed in", async () => {
    stubMailbox({ mode: "read", body: THREAD });
    jobFlow({ jobType: "review", summary: "Acme wants the NDA signed by Friday.", issues: [] });
    renderPanel({ signedIn: true });

    fireEvent.click(screen.getByRole("button", { name: "Summarise this thread" }));

    expect(await screen.findByText("Acme wants the NDA signed by Friday.")).toBeInTheDocument();
    expect(sentBody(0).text).toBe(THREAD);
    expect(sentBody(0).instructions).toMatch(/Summarise this email thread/);
  });

  it("adds a quiet See plans link when the review allowance is used up", async () => {
    stubMailbox({ mode: "read", body: THREAD });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(planRefusal(429, "over_plan_quota", "You've used up this period's allowance."));
    renderPanel({ signedIn: true });

    fireEvent.click(screen.getByRole("button", { name: "Summarise this thread" }));

    const line = await screen.findByText(/^You've used up this period's allowance\./);
    expect(within(line).getByRole("link", { name: "See plans" })).toHaveAttribute("href", "https://elefant.legal/pricing");
  });

  it("says so when the summary comes back empty, rather than showing a blank", async () => {
    stubMailbox({ mode: "read", body: THREAD });
    vi.mocked(runReview).mockResolvedValueOnce({ summary: "  ", issues: [] });
    renderPanel({ apiKey: "key" });

    fireEvent.click(screen.getByRole("button", { name: "Summarise this thread" }));

    expect(await screen.findByText("The summary came back empty.")).toBeInTheDocument();
  });

  it("shows Outlook's own error when the message cannot be read", async () => {
    stubMailbox({ mode: "read", body: THREAD, failWith: "The item is not available." });
    renderPanel({ apiKey: "key" });

    fireEvent.click(screen.getByRole("button", { name: "Summarise this thread" }));

    expect(await screen.findByText("The item is not available.")).toBeInTheDocument();
  });
});

describe("Outlook pane outside a message", () => {
  it("says to open it from an email", () => {
    renderPanel();
    expect(screen.getByText("Open Elefant from an email in Outlook.")).toBeInTheDocument();
  });
});

describe("OutlookApp", () => {
  it("shows the Elefant header without Word's tab bar, and Settings offers the Gemini key", async () => {
    stubMailbox({ mode: "read", body: THREAD });
    render(<OutlookApp />);

    expect(screen.getByText("Elefant")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    await waitFor(() => expect(screen.getByText("API Key (BYOK)")).toBeInTheDocument());
  });
});
