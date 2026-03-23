// ABOUTME: Review panel — select text in Word, send for AI review, display results.
// ABOUTME: Free tier uses ADK-JS + Gemini in-browser; paid tier uses Elefant API with job polling.

import { useState } from "react";
import type { ReviewResponse, ReviewIssue, IssueKind } from "@/types/api";
import { useSettings } from "@/store/settings";
import { useAuth } from "@/store/auth";
import { useUI } from "@/store/ui";
import { reviewFree, reviewPaid } from "@/api/review";
import { getSelectedText, getDocumentBody, insertText, isOfficeReady } from "@/lib/office";
import { addToLocalHistory } from "@/lib/history";
import { ToggleGroup } from "@/components/ToggleGroup";

type Scope = "selection" | "document";

const SEVERITY_COLORS: Record<IssueKind, string> = {
  risk: "bg-red-100 text-red-700",
  ambiguity: "bg-yellow-100 text-yellow-700",
  missing: "bg-orange-100 text-orange-700",
  style: "bg-blue-100 text-blue-700",
  other: "bg-gray-100 text-gray-600",
};

export function ReviewPanel() {
  const { settings } = useSettings();
  const { tier, token } = useAuth();
  const { openSettings } = useUI();
  const [scope, setScope] = useState<Scope>("selection");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResponse | null>(null);

  const canReview = tier === "paid" ? !!token : !!settings.apiKey;
  const inOffice = isOfficeReady();

  async function handleReview() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const text = inOffice
        ? scope === "selection"
          ? await getSelectedText()
          : await getDocumentBody()
        : null;

      if (!text || text.trim().length < 10) {
        setError(
          inOffice
            ? "Please select some text in your document (at least 10 characters)."
            : "This feature requires Microsoft Word. Open this add-in from within Word to review documents.",
        );
        return;
      }

      const response =
        tier === "paid" && token
          ? await reviewPaid(text, token, instructions || undefined)
          : await reviewFree(text, settings.apiKey, settings.model, instructions || undefined);

      setResult(response);

      if (tier === "free") {
        addToLocalHistory({ type: "review", summary: response.summary });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleInsert(text: string) {
    if (!inOffice) return;
    try {
      await insertText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to insert text");
    }
  }

  return (
    <div className="space-y-3">
      {!canReview && !result && (
        <p className="text-xs leading-relaxed text-gray-500">
          AI-powered legal document review. Select text in Word and get instant analysis of risks, ambiguities, and missing clauses.
        </p>
      )}

      {/* Scope selector */}
      <ToggleGroup
        options={[
          { value: "selection", label: "Selection" },
          { value: "document", label: "Full Document" },
        ]}
        value={scope}
        onChange={(v) => { setScope(v as Scope); setError(null); }}
      />

      {/* Instructions */}
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Review instructions (optional)..."
        rows={2}
        className="w-full resize-none rounded-md border border-gray-200 px-2.5 py-2 text-xs transition-colors focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
      />

      {/* Review button */}
      <button
        onClick={handleReview}
        disabled={loading || !canReview}
        className="w-full rounded-md bg-blue-600 px-3 py-2.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Reviewing..." : "Review Document"}
      </button>

      {!canReview && (
        <button
          onClick={openSettings}
          className="w-full rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-left text-xs text-amber-700 transition-colors hover:bg-amber-100"
        >
          {tier === "free"
            ? "Add your Gemini API key in Settings to get started \u2192"
            : "Sign in to your Elefant account to review \u2192"}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="shrink-0 text-red-400 transition-colors hover:text-red-600"
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {/* Results */}
      {result && <ReviewResults result={result} onInsert={handleInsert} />}
    </div>
  );
}

function ReviewResults({ result, onInsert }: { result: ReviewResponse; onInsert: (text: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5">
        <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Summary</h4>
        <p className="text-xs leading-relaxed text-gray-700">{result.summary}</p>
      </div>

      {result.issues && result.issues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-600">Issues ({result.issues.length})</h4>
          {result.issues.map((issue, i) => (
            <IssueCard key={`${issue.kind}-${i}-${(issue.message ?? "").slice(0, 30)}`} issue={issue} onInsert={onInsert} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue, onInsert }: { issue: ReviewIssue; onInsert: (text: string) => void }) {
  const kind = issue.kind ?? "other";
  return (
    <div className="rounded-md border border-gray-200 p-2.5">
      <div className="mb-1 flex items-start gap-1.5">
        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[kind]}`}>
          {kind}
        </span>
        <p className="flex-1 text-xs text-gray-700">{issue.message}</p>
      </div>
      {issue.location && <p className="text-[10px] italic text-gray-400">"{issue.location}"</p>}
      {issue.suggestion && (
        <div className="mt-1.5 flex items-start gap-1">
          <p className="flex-1 text-xs text-green-700">{issue.suggestion}</p>
          <button
            onClick={() => onInsert(issue.suggestion!)}
            className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700 hover:bg-green-100"
          >
            Insert
          </button>
        </div>
      )}
    </div>
  );
}

