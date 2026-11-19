// ABOUTME: Citations tab — checks the selection (or the whole document or message) through Elefant's citation-check job.
// ABOUTME: Labels each citation in plain words and can show it in the document; gated by the plan's citation limits.

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/store/auth";
import { PRICING_URL, useUpsell } from "@/store/upsell";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { ApiError } from "@/api/client";
import { checkCitations, type CitationFinding, type CitationStatus } from "@/api/citations";
import { useHost } from "@/store/host";
import { useSendNotice } from "@/components/SendNotice";
import { isPlanLimit, planIncludes } from "@/lib/plan-features";

// Plain words for the API's statuses; users never see "verified" or "certified" (owner's standing rule).
const STATUS_LABELS: Record<CitationStatus, string> = {
  verified: "Found",
  mismatch: "Doesn't match",
  hallucinated: "Not found",
  uncertain: "Unsure",
};

const STATUS_STYLES: Record<CitationStatus, string> = {
  verified: "bg-green-50 text-green-700",
  mismatch: "bg-amber-50 text-amber-700",
  hallucinated: "bg-red-50 text-red-700",
  uncertain: "bg-gray-100 text-gray-600",
};

const OUTSIDE_WORD = "Checking citations needs Microsoft Word: open Elefant from the Word ribbon.";
const NOT_IN_DOCUMENT = "Couldn't find this citation in the document.";
const NEEDS_ACCOUNT = "Citation checking needs an Elefant account. Sign in from Settings.";

export function CitationsPanel() {
  const { tier, token, user } = useAuth();

  // Signed out, the line asks for an account rather than pointing at plans (owner, 17 Nov).
  if (tier !== "paid" || !token) return <p className="py-6 text-center text-xs text-gray-500">{NEEDS_ACCOUNT}</p>;
  if (!planIncludes(user, "citationCheck")) return <UpgradePrompt feature="Citation checking" />;

  return <CitationsContent token={token} />;
}

function summarise(findings: CitationFinding[]): string {
  if (findings.length === 0) return "No citations found in the text.";
  const count = (status: CitationStatus) => findings.filter((f) => f.status === status).length;
  const counts = (Object.keys(STATUS_LABELS) as CitationStatus[]).map((s) => `${STATUS_LABELS[s]} ${count(s)}`).join(", ");
  return `Checked ${findings.length} citation${findings.length === 1 ? "" : "s"}: ${counts}.`;
}

const isWebAddress = (url: string | null): url is string => !!url && /^https?:\/\//i.test(url);

function CitationsContent({ token }: { token: string }) {
  const host = useHost();
  const { select } = host;
  const announce = useSendNotice();
  const upsell = useUpsell();
  const [checking, setChecking] = useState(false);
  const [findings, setFindings] = useState<CitationFinding[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planLimit, setPlanLimit] = useState(false);
  const [missing, setMissing] = useState<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  // The pane stays mounted when hidden, so only leaving the add-in stops a running check.
  useEffect(() => () => inFlight.current?.abort(), []);

  async function handleCheck() {
    if (!host.ready()) {
      setError(OUTSIDE_WORD);
      return;
    }
    const controller = new AbortController();
    inFlight.current = controller;
    setChecking(true);
    setError(null);
    setPlanLimit(false);
    setFindings(null);
    setMissing(null);
    try {
      const selected = (await host.selection()).trim();
      const text = selected || (await host.body()).trim();
      if (!text) {
        setError(`This ${host.noun} doesn't have any text to check.`);
        return;
      }
      await announce("elefant");
      const found = await checkCitations(text, token, controller.signal);
      if (!controller.signal.aborted) setFindings(found);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Citation check failed");
      setPlanLimit(err instanceof ApiError && isPlanLimit(err.reason));
    } finally {
      setChecking(false);
    }
  }

  async function handleShow(select: (text: string) => Promise<boolean>, citation: string) {
    try {
      setMissing((await select(citation)) ? null : citation);
    } catch {
      setMissing(citation);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Checks the selected text, or the whole {host.noun} when nothing is selected.</p>
      <button
        type="button"
        onClick={() => void handleCheck()}
        disabled={checking}
        className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {checking ? "Checking..." : "Check citations"}
      </button>

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

      {findings && (
        <div className="space-y-2">
          <p role="status" className="text-xs text-gray-600">{summarise(findings)}</p>
          <ul className="space-y-1.5">
            {findings.map((finding, i) => (
              <li key={`${finding.citation}-${i}`} className="rounded border border-gray-200 px-2 py-1.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-gray-800">{finding.citation}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[finding.status]}`}>
                    {STATUS_LABELS[finding.status]}
                  </span>
                </div>
                <div className="mt-1 flex gap-3">
                  {select && (
                    <button
                      type="button"
                      onClick={() => void handleShow(select, finding.citation)}
                      aria-label={`Show ${finding.citation} in the document`}
                      className="text-blue-600 hover:underline"
                    >
                      Show in document
                    </button>
                  )}
                  {isWebAddress(finding.sourceUrl) && (
                    <a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Source for ${finding.citation}`} className="text-blue-600 hover:underline">
                      Source
                    </a>
                  )}
                </div>
                {missing === finding.citation && <p className="mt-1 text-gray-500">{NOT_IN_DOCUMENT}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
