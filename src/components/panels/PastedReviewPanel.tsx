// ABOUTME: Review panel for hosts with no document (Teams): paste text, review it, read the results.
// ABOUTME: Runs the same review as the Word task pane (reviewText) and shows the same results.

import { useState } from "react";
import { useSettings } from "@/store/settings";
import { useAuth } from "@/store/auth";
import { useUI } from "@/store/ui";
import { addToLocalHistory } from "@/lib/history";
import { reviewText, ReviewResults, type ReviewView } from "./ReviewPanel";

const MIN_REVIEW_CHARS = 10;

export function PastedReviewPanel() {
  const { settings } = useSettings();
  const { tier, token } = useAuth();
  const { openSettings } = useUI();
  const [text, setText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewView | null>(null);

  const canReview = tier === "paid" ? !!token : !!settings.apiKey;

  async function handleReview() {
    setError(null);
    setResult(null);
    if (text.trim().length < MIN_REVIEW_CHARS) {
      setError(`Paste at least ${MIN_REVIEW_CHARS} characters to review.`);
      return;
    }
    setLoading(true);
    try {
      const response = await reviewText(text, { tier, token, apiKey: settings.apiKey, model: settings.model, instructions });
      setResult(response);
      if (tier === "free") addToLocalHistory({ type: "review", summary: response.summary });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the text to review..."
        rows={8}
        className="w-full resize-y rounded-md border border-gray-200 px-2.5 py-2 text-xs transition-colors focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
      />

      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Review instructions (optional)..."
        rows={2}
        className="w-full resize-none rounded-md border border-gray-200 px-2.5 py-2 text-xs transition-colors focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
      />

      <button
        onClick={handleReview}
        disabled={loading || !canReview}
        className="w-full rounded-md bg-blue-600 px-3 py-2.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Reviewing..." : "Review Text"}
      </button>

      {!canReview && (
        <button
          onClick={openSettings}
          className="w-full rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-left text-xs text-amber-700 transition-colors hover:bg-amber-100"
        >
          {tier === "free"
            ? "Add your Gemini API key in Settings to get started →"
            : "Sign in to your Elefant account to review →"}
        </button>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">{error}</div>
      )}

      {result && <ReviewResults result={result} />}
    </div>
  );
}
