// ABOUTME: Proves every BYOK panel waits for key-specific Google acknowledgement.
// ABOUTME: Real panels and notices; only service and Office boundaries are replaced.

import { webcrypto, createHash } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReviewPanel } from "@/components/panels/ReviewPanel";
import { PastedReviewPanel } from "@/components/panels/PastedReviewPanel";
import { ClauseDrafting, ClausesPanel } from "@/components/panels/ClausesPanel";
import { MailPanel } from "@/components/panels/MailPanel";
import { SendNoticeProvider } from "@/components/SendNotice";
import { SettingsContext } from "@/store/settings";
import { AuthContext, AUTH_INITIAL } from "@/store/auth";
import { UIContext } from "@/store/ui";
import type { MeResponse } from "@/types/api";
import { reviewFree, reviewPaid } from "@/api/review";
import { draftClause } from "@/api/clauses";
import { runDraft, runReply } from "@/lib/agent";

const host = vi.hoisted(() => ({
  composing: false,
  insert: vi.fn(async () => {}),
}));
vi.mock("@/lib/office", () => ({
  isOfficeReady: () => true,
  getSelectedText: async () => "The Supplier shall deliver the Goods.",
  getDocumentBody: async () => "The Supplier shall deliver the Goods.",
  insertText: vi.fn(),
}));
vi.mock("@/lib/mailbox", () => ({ isMailboxReady: () => true, isComposing: () => host.composing }));
vi.mock("@/store/host", () => ({
  useHost: () => ({
    ready: () => true,
    selection: async () => "The Supplier shall deliver the Goods.",
    body: async () => "Please sign the NDA by Friday.",
    insert: host.insert,
  }),
}));
vi.mock("@/api/review", () => ({
  reviewFree: vi.fn(async () => ({ summary: "Reviewed.", issues: [] })),
  reviewPaid: vi.fn(async () => ({ summary: "Reviewed.", issues: [] })),
}));
vi.mock("@/api/clauses", () => ({ draftClause: vi.fn(async () => "Drafted.") }));
vi.mock("@/lib/agent", () => ({
  runDraft: vi.fn(async () => "Drafted."),
  runReply: vi.fn(async () => "Reply drafted."),
}));

const KEY = "test-google-key";
const HEADING = "Before you send this to Google";
const flows = [
  { name: "Word review", Panel: ReviewPanel, action: "Review Document", request: reviewFree, paidRequest: reviewPaid },
  { name: "pasted review", Panel: PastedReviewPanel, action: "Review Text", request: reviewFree, paidRequest: reviewPaid, placeholder: "Paste the text to review..." },
  { name: "clause draft", Panel: ClausesPanel, action: "Draft clause", request: runDraft, paidRequest: draftClause, placeholder: "Describe the clause to draft..." },
  { name: "mail reply", Panel: MailPanel, action: "Draft reply", request: runReply, paidRequest: draftClause, placeholder: "What should the reply say?" },
  { name: "mail summary", Panel: MailPanel, action: "Summarise this thread", request: reviewFree, paidRequest: reviewPaid },
];

function pane(flow: typeof flows[number], key = KEY, paid = false) {
  const { Panel } = flow;
  return (
    <SettingsContext value={{ settings: { apiKey: key, model: "gemini-4-hydrogen" }, updateSettings: vi.fn() }}>
      <AuthContext value={{
        ...AUTH_INITIAL, tier: paid ? "paid" : "free", token: paid ? "token" : null,
        user: paid ? { entitlements: { plan: "lite" } } as MeResponse : null,
        login: async () => {}, logout: () => {},
      }}>
        <UIContext value={{ openSettings: vi.fn() }}>
          <SendNoticeProvider><Panel /></SendNoticeProvider>
        </UIContext>
      </AuthContext>
    </SettingsContext>
  );
}

function send(flow: typeof flows[number]) {
  if (flow.placeholder) fireEvent.change(screen.getByPlaceholderText(flow.placeholder), { target: { value: "Draft a payment clause with thirty day terms." } });
  fireEvent.click(screen.getByRole("button", { name: flow.action }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", webcrypto);
  localStorage.clear();
  // The older destination notice is independent of the Google terms acknowledgement.
  localStorage.setItem("elefant_send_ack_google", "1");
  localStorage.setItem("elefant_send_ack_elefant", "1");
  host.composing = false;
});
afterEach(() => vi.unstubAllGlobals());

describe.each(flows)("$name Google notice", (flow) => {
  beforeEach(() => { host.composing = flow.name === "mail reply"; });

  it("sends nothing before I understand", async () => {
    render(pane(flow));
    send(flow);
    expect(await screen.findByRole("dialog", { name: HEADING })).toBeInTheDocument();
    expect(screen.getByText("This free review runs on your own Google Gemini key. Your key and the text you selected go straight from Word to Google, not to Elefant.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("If your key is unpaid, Google may use what you send to improve its products, and its reviewers may read it. For client work, use a paid-tier key.");
    expect(screen.getByRole("link", { name: "paid-tier key" })).toHaveAttribute("href", "https://ai.google.dev/gemini-api/terms");
    expect(flow.request).not.toHaveBeenCalled();
    expect(screen.queryByText("On its way to Google, with your key")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "I understand" }));
    await waitFor(() => expect(flow.request).toHaveBeenCalledTimes(1));
    const keyIndex = flow.request === reviewFree ? 1 : 0;
    expect(vi.mocked(flow.request).mock.calls[0][keyIndex]).toBe(KEY);
  });

  it("Cancel sends nothing and does not acknowledge the key", async () => {
    render(pane(flow));
    send(flow);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.getByRole("button", { name: flow.action })).toBeEnabled());
    expect(flow.request).not.toHaveBeenCalled();
    expect(host.insert).not.toHaveBeenCalled();
    expect(screen.queryByText("On its way to Google, with your key")).toBeNull();
    send(flow);
    expect(await screen.findByRole("dialog", { name: HEADING })).toBeInTheDocument();
    expect(flow.request).not.toHaveBeenCalled();
  });

  it("never shows the Google notice on the paid tier", async () => {
    render(pane(flow, KEY, true));
    send(flow);
    await waitFor(() => expect(flow.paidRequest).toHaveBeenCalledTimes(1));
    expect(flow.request).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: HEADING })).toBeNull();
  });
});

it("remembers only the SHA-256 acknowledgement across panels and remounts, and asks for a changed key", async () => {
  const first = render(pane(flows[0]));
  send(flows[0]);
  fireEvent.click(await screen.findByRole("button", { name: "I understand" }));
  await waitFor(() => expect(reviewFree).toHaveBeenCalledTimes(1));
  first.unmount();

  const stored = Object.entries(localStorage).flat().join(" ");
  expect(stored).toContain(createHash("sha256").update(KEY).digest("hex"));
  expect(stored).not.toContain(KEY);

  const second = render(pane(flows[1]));
  send(flows[1]);
  await waitFor(() => expect(reviewFree).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole("dialog", { name: HEADING })).toBeNull();

  second.rerender(pane(flows[1], "changed-google-key"));
  send(flows[1]);
  expect(await screen.findByRole("dialog", { name: HEADING })).toBeInTheDocument();
  expect(reviewFree).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "I understand" }));
  await waitFor(() => expect(reviewFree).toHaveBeenCalledTimes(3));
  expect(vi.mocked(reviewFree).mock.calls[2][1]).toBe("changed-google-key");
});

it("sends nothing if SHA-256 cannot be computed", async () => {
  vi.stubGlobal("crypto", { subtle: { digest: vi.fn(async () => { throw new Error("Hash unavailable"); }) } });
  render(pane(flows[0]));
  await act(async () => send(flows[0]));
  expect(reviewFree).not.toHaveBeenCalled();
});

// DraftClause shares its send ordering between Word, Outlook and the copy flow.
describe.each([
  flows[2],
  flows[3],
  { ...flows[2], name: "copy clause draft", Panel: () => <ClauseDrafting copy /> },
])("$name destination ordering", (flow) => {
  it("shows the destination notice only after I understand and leaves no send notice after Cancel", async () => {
    host.composing = flow.name === "mail reply";
    localStorage.removeItem("elefant_send_ack_google");
    render(pane(flow));
    send(flow);
    expect(await screen.findByRole("dialog", { name: HEADING })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Where your text goes" })).toBeNull();
    expect(screen.queryByText("On its way to Google, with your key")).toBeNull();
    expect(flow.request).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.getByRole("button", { name: flow.action })).toBeEnabled());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("On its way to Google, with your key")).toBeNull();
    expect(localStorage.getItem("elefant_send_ack_google")).toBeNull();
    expect(flow.request).not.toHaveBeenCalled();
    expect(host.insert).not.toHaveBeenCalled();

    send(flow);
    fireEvent.click(await screen.findByRole("button", { name: "I understand" }));
    expect(await screen.findByRole("dialog", { name: "Where your text goes" })).toBeInTheDocument();
    expect(flow.request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(flow.request).toHaveBeenCalledTimes(1));
    expect(screen.getByText("On its way to Google, with your key")).toBeInTheDocument();
  });
});
