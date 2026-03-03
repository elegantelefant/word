// ABOUTME: Review panel — select text in Word, send for AI review, display results.
// ABOUTME: Free tier uses ADK-JS + Gemini in-browser; paid tier uses Elefant API with job polling.

import { useState } from "react";
import type { ReviewResponse, ReviewIssue, IssueKind } from "@/types/api";
import { useSettings } from "@/store/settings";
import { useAuth } from "@/store/auth";
import { reviewFree, reviewPaid } from "@/api/review";
import { getSelectedText, getDocumentBody, insertText, isOfficeReady } from "@/lib/office";
import { addToLocalHistory } from "./HistoryPanel";

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
  const [scope, setScope] = useState<Scope>("selection");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResponse | null>(null);

  const canReview = tier === "paid" ? !!token : !!settings.apiKey;

  async function handleReview() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const text = isOfficeReady()
        ? scope === "selection"
          ? await getSelectedText()
          : await getDocumentBody()
        : "";

      if (!text || text.trim().length < 10) {
        setError("Please select some text in your document (at least 10 characters).");
        return;
      }

      const response =
        tier === "paid" && token
          ? await reviewPaid(text, token, instructions || undefined)
          : await reviewFree(text, settings.apiKey, settings.model, instructions || undefined);

      setResult(response);

      // Save to local history (especially useful for free-tier users)
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
    if (!isOfficeReady()) return;
    try {
      await insertText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to insert text");
    }
  }

  return (
    <div className="space-y-3">
      {/* Scope selector */}
      <div className="flex gap-2">
        <ScopeButton active={scope === "selection"} onClick={() => setScope("selection")}>
          Selection
        </ScopeButton>
        <ScopeButton active={scope === "document"} onClick={() => setScope("document")}>
          Full Document
        </ScopeButton>
      </div>

      {/* Instructions */}
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Review instructions (optional)..."
        rows={2}
        className="w-full resize-none rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
      />

      {/* Review button */}
      <button
        onClick={handleReview}
        disabled={loading || !canReview}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Reviewing..." : "Review"}
      </button>

      {!canReview && (
        <p className="text-xs text-amber-600">
          {tier === "free" ? "Enter your Gemini API key in Settings to review." : "Sign in to review."}
        </p>
      )}

      {/* Error */}
      {error && <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</div>}

      {/* Results */}
      {result && <ReviewResults result={result} onInsert={handleInsert} />}
    </div>
  );
}

function ReviewResults({ result, onInsert }: { result: ReviewResponse; onInsert: (text: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded border border-gray-200 bg-gray-50 p-2">
        <h4 className="mb-1 text-xs font-semibold text-gray-600">Summary</h4>
        <p className="text-xs text-gray-700">{result.summary}</p>
      </div>

      {result.issues && result.issues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-600">Issues ({result.issues.length})</h4>
          {result.issues.map((issue, i) => (
            <IssueCard key={i} issue={issue} onInsert={onInsert} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue, onInsert }: { issue: ReviewIssue; onInsert: (text: string) => void }) {
  const kind = issue.kind ?? "other";
  return (
    <div className="rounded border border-gray-200 p-2">
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

function ScopeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium ${
        active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
