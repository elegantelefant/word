// ABOUTME: Outlook pane — writing: check citations and draft a reply; reading: summarise the thread.
// ABOUTME: Elefant mode when signed in, the user's own Gemini key otherwise; the panels are Word's, on the mail host.

import { useState } from "react";
import { useAuth } from "@/store/auth";
import { useSettings } from "@/store/settings";
import { PRICING_URL, useUpsell } from "@/store/upsell";
import { useHost } from "@/store/host";
import { useSendNotice } from "@/components/SendNotice";
import { CitationsPanel } from "./CitationsPanel";
import { DraftClause } from "@/components/DraftClause";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { ApiError } from "@/api/client";
import { draftClause } from "@/api/clauses";
import { reviewFree, reviewPaid } from "@/api/review";
import { isComposing, isMailboxReady } from "@/lib/mailbox";
import { isPlanLimit, planIncludes } from "@/lib/plan-features";

// /draft takes one prompt; this frames it as a reply, with the thread as its context.
const REPLY_PROMPT = "Draft the body of a reply to this email thread. The reply should:";
// Summaries ride on /review (and the free review agent), whose result carries a summary.
const SUMMARY_INSTRUCTIONS =
  "Summarise this email thread for a lawyer in a few sentences: who wants what, by when, and what is still open. Use only what the emails say.";

const NOT_IN_MESSAGE = "Open Elefant from an email in Outlook.";

export function MailPanel() {
  if (!isMailboxReady()) return <p className="py-6 text-center text-xs text-gray-500">{NOT_IN_MESSAGE}</p>;

  return (
    <div className="space-y-4">
      {isComposing() ? (
        <>
          <CitationsPanel />
          <Reply />
        </>
      ) : (
        <ThreadSummary />
      )}
    </div>
  );
}

function Reply() {
  const { tier, token, user } = useAuth();
  const { settings } = useSettings();
  const host = useHost();

  if (tier === "paid" && token) {
    if (!planIncludes(user, "draft")) return <UpgradePrompt feature="Drafting" />;
    return <DraftClause kind="reply" sendsTo="elefant" draft={async (prompt) => draftClause(`${REPLY_PROMPT} ${prompt}`, await host.body(), token)} />;
  }

  async function replyWithOwnKey(prompt: string) {
    const { runReply } = await import("@/lib/agent");
    return runReply(settings.apiKey, settings.model, prompt, await host.body());
  }

  return (
    <DraftClause
      kind="reply"
      sendsTo="google"
      draft={replyWithOwnKey}
      unavailable={settings.apiKey ? undefined : "Add your Gemini API key in Settings to draft."}
    />
  );
}

function ThreadSummary() {
  const { tier, token } = useAuth();
  const { settings } = useSettings();
  const host = useHost();
  const upsell = useUpsell();
  const announce = useSendNotice();
  const [summarising, setSummarising] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planLimit, setPlanLimit] = useState(false);

  const signedIn = tier === "paid" && !!token;
  const unavailable = !signedIn && !settings.apiKey;

  async function handleSummarise() {
    setSummarising(true);
    setSummary(null);
    setError(null);
    setPlanLimit(false);
    try {
      const thread = await host.body();
      await announce(signedIn ? "elefant" : "google");
      const result = signedIn
        ? await reviewPaid(thread, token, SUMMARY_INSTRUCTIONS)
        : await reviewFree(thread, settings.apiKey, settings.model, SUMMARY_INSTRUCTIONS);
      const text = result.summary?.trim();
      if (!text) throw new Error("The summary came back empty.");
      setSummary(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Summary failed");
      setPlanLimit(err instanceof ApiError && isPlanLimit(err.reason));
    } finally {
      setSummarising(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => void handleSummarise()}
        disabled={unavailable || summarising}
        className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {summarising ? "Summarising..." : "Summarise this thread"}
      </button>
      {unavailable && <p className="text-xs text-gray-500">Add your Gemini API key in Settings to summarise.</p>}
      {summary !== null && <p role="status" className="whitespace-pre-wrap text-xs text-gray-700">{summary}</p>}
      {error && (
        <p className="text-xs text-red-600">
          {error}
          {upsell && planLimit && (
            <>
              {" "}
              <a href={PRICING_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                See plans
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
