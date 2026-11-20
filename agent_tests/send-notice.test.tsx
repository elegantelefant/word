// ABOUTME: Tests the send notice: a one-time screen per destination before the first send, then a short toast on every send.
// ABOUTME: Real provider and panels; only the mailbox, fetch and the BYOK agent call are replaced.

import { webcrypto, createHash } from "node:crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { SendNoticeProvider, SEND_TOAST_MS, useSendNotice } from "@/components/SendNotice";
import { MailPanel } from "@/components/panels/MailPanel";
import { AuthContext, AUTH_INITIAL, type AuthContextValue } from "@/store/auth";
import { SettingsContext } from "@/store/settings";
import { HostContext } from "@/store/host";
import { MAIL_HOST } from "@/lib/mailbox";
import { runReview } from "@/lib/agent";
import type { MeResponse } from "@/types/api";
import { stubMailbox } from "./mailbox-stub";

vi.mock("@/lib/agent", () => ({
  runReply: vi.fn(async () => "Reply."),
  runReview: vi.fn(async () => ({ summary: "Acme asks for signature by Friday.", issues: [] })),
}));

const THREAD = "Please sign the NDA by Friday.";
const PRO_ME = { user: { id: "u", email: "e", name: "n" }, org: null, entitlements: { plan: "pro" } } as unknown as MeResponse;

function renderPane({ signedIn = false } = {}) {
  const auth: AuthContextValue = signedIn
    ? { ...AUTH_INITIAL, token: "tok", tier: "paid", user: PRO_ME, login: async () => {}, logout: () => {} }
    : { ...AUTH_INITIAL, login: async () => {}, logout: () => {} };
  return render(
    <SettingsContext value={{ settings: { apiKey: "key", model: "gemini-3.8-flash" }, updateSettings: () => {} }}>
      <AuthContext value={auth}>
        <HostContext value={MAIL_HOST}>
          <SendNoticeProvider><MailPanel /></SendNoticeProvider>
        </HostContext>
      </AuthContext>
    </SettingsContext>,
  );
}

const summarise = () => fireEvent.click(screen.getByRole("button", { name: "Summarise this thread" }));
const continueButton = () => screen.getByRole("button", { name: "Continue" });

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(runReview).mockClear();
  localStorage.clear();
  stubMailbox({ mode: "read", body: THREAD });
  // These flows start with an acknowledged key; google-notice.test.tsx covers first use.
  vi.stubGlobal("crypto", webcrypto);
  localStorage.setItem(`elefant_google_notice_ack_${createHash("sha256").update("key").digest("hex")}`, "1");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("first send on this device", () => {
  it("says the text goes to Google with the user's key, and sends nothing until Continue", async () => {
    renderPane();
    summarise();

    expect(await screen.findByRole("dialog")).toHaveTextContent("When you use your own Gemini key, the text you send goes from this device to Google, using your own key.");
    expect(vi.mocked(runReview)).not.toHaveBeenCalled();

    fireEvent.click(continueButton());
    expect(await screen.findByText("Acme asks for signature by Friday.")).toBeInTheDocument();
  });

  it("does not ask again once accepted", async () => {
    renderPane();
    summarise();
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    await screen.findByText("Acme asks for signature by Friday.");

    summarise();
    expect(await screen.findByText("Acme asks for signature by Friday.")).toBeInTheDocument();
    expect(vi.mocked(runReview)).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks again for Elefant after accepting Google, because the destination changed", async () => {
    renderPane();
    summarise();
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    await screen.findByText("Acme asks for signature by Friday.");

    const signedIn = renderPane({ signedIn: true });
    fireEvent.click(signedIn.getAllByRole("button", { name: "Summarise this thread" }).at(-1)!);

    expect(await screen.findByRole("dialog")).toHaveTextContent(/Elefant/);
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/Google/);
  });

  it("replaces the old footnote rather than adding to it", () => {
    renderPane();
    expect(screen.queryByText(/the email text is sent to/)).toBeNull();
  });
});

describe("every send", () => {
  function Sender({ to }: { to: "google" | "elefant" }) {
    const announce = useSendNotice();
    return <button onClick={() => void announce(to)}>send</button>;
  }

  it("shows a short toast naming the destination, with nothing to click", async () => {
    localStorage.setItem("elefant_send_ack_elefant", "1");
    render(<SendNoticeProvider><Sender to="elefant" /></SendNoticeProvider>);

    fireEvent.click(screen.getByRole("button", { name: "send" }));

    const toast = await screen.findByRole("status");
    expect(toast).toHaveTextContent(/^On its way to Elefant$/);
    expect(toast.querySelector("button")).toBeNull();
  });

  it("dismisses the toast by itself", async () => {
    vi.useFakeTimers();
    localStorage.setItem("elefant_send_ack_google", "1");
    render(<SendNoticeProvider><Sender to="google" /></SendNoticeProvider>);

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "send" })));
    expect(screen.getByRole("status")).toHaveTextContent(/Google/);

    act(() => vi.advanceTimersByTime(SEND_TOAST_MS));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("is a calm 2 to 3 seconds", () => {
    expect(SEND_TOAST_MS).toBeGreaterThanOrEqual(2000);
    expect(SEND_TOAST_MS).toBeLessThanOrEqual(3000);
  });
});

describe("the one-time screen under pressure", () => {
  function Sender({ to, onSent }: { to: "google" | "elefant"; onSent: () => void }) {
    const announce = useSendNotice();
    return <button onClick={() => void announce(to).then(onSent)}>send</button>;
  }

  it("lets every waiting send through on one Continue", async () => {
    const sent = vi.fn();
    render(<SendNoticeProvider><Sender to="google" onSent={sent} /><Sender to="google" onSent={sent} /></SendNoticeProvider>);

    for (const button of screen.getAllByRole("button", { name: "send" })) fireEvent.click(button);
    const go = await screen.findByRole("button", { name: "Continue" });
    await act(async () => fireEvent.click(go));

    await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(2));
  });

  it("still sends, and asks only once this session, when the browser blocks storage", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    const sent = vi.fn();
    render(<SendNoticeProvider><Sender to="elefant" onSent={sent} /></SendNoticeProvider>);

    fireEvent.click(screen.getByRole("button", { name: "send" }));
    const go = await screen.findByRole("button", { name: "Continue" });
    await act(async () => fireEvent.click(go));
    await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(1));

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "send" })));
    await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("puts the keyboard on Continue", async () => {
    render(<SendNoticeProvider><Sender to="google" onSent={() => {}} /></SendNoticeProvider>);
    fireEvent.click(screen.getByRole("button", { name: "send" }));
    expect(await screen.findByRole("button", { name: "Continue" })).toHaveFocus();
  });
});

describe("without the provider", () => {
  it("sends with an acknowledged key without the destination notice provider", async () => {
    render(
      <SettingsContext value={{ settings: { apiKey: "key", model: "m" }, updateSettings: () => {} }}>
        <AuthContext value={{ ...AUTH_INITIAL, login: async () => {}, logout: () => {} }}>
          <HostContext value={MAIL_HOST}><MailPanel /></HostContext>
        </AuthContext>
      </SettingsContext>,
    );
    summarise();
    expect(await screen.findByText("Acme asks for signature by Friday.")).toBeInTheDocument();
  });
});
