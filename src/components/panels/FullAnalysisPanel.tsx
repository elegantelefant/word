// ABOUTME: Full Analysis panel — fires parallel review + research jobs.
// ABOUTME: Paid-only "nuclear option" for comprehensive document analysis.

import { useState } from "react";
import { useAuth } from "@/store/auth";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { apiFetch } from "@/api/client";
import { pollForResult } from "@/lib/polling";
import { getSelectedText, getDocumentBody, isOfficeReady } from "@/lib/office";
import type { JobCreated, ReviewResponse } from "@/types/api";

type AnalysisStatus = "idle" | "running" | "done" | "error";

interface AnalysisResult {
  review?: ReviewResponse;
  research?: { report: string };
}

export function FullAnalysisPanel() {
  const { tier, token } = useAuth();

  if (tier !== "paid" || !token) {
    return <UpgradePrompt feature="Full Analysis" />;
  }

  return <AnalysisContent token={token} />;
}

function AnalysisContent({ token }: { token: string }) {
  const [scope, setScope] = useState<"selection" | "document">("selection");
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function handleAnalyze() {
    setStatus("running");
    setError(null);
    setResult(null);

    try {
      const text = isOfficeReady()
        ? scope === "selection"
          ? await getSelectedText()
          : await getDocumentBody()
        : "";

      if (!text || text.trim().length < 10) {
        setError("Please select some text (at least 10 characters).");
        setStatus("error");
        return;
      }

      // Fire review and research in parallel
      const [reviewJob, researchJob] = await Promise.all([
        apiFetch<JobCreated>("/review", token, { method: "POST", body: { text } }),
        apiFetch<JobCreated>("/research", token, {
          method: "POST",
          body: { query: `Analyze the following legal text and identify all legal risks, obligations, and key terms:\n\n${text}` },
        }).catch(() => null), // Research endpoint may not exist — graceful fallback
      ]);

      const results: AnalysisResult = {};

      // Poll both jobs
      const [reviewResult, researchResult] = await Promise.all([
        pollForResult(reviewJob.job_id, token),
        researchJob ? pollForResult(researchJob.job_id, token).catch(() => null) : null,
      ]);

      results.review = reviewResult.result as unknown as ReviewResponse;
      if (researchResult?.result) {
        results.research = researchResult.result as unknown as { report: string };
      }

      setResult(results);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setStatus("error");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Run comprehensive analysis: parallel review + research on your document.
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => setScope("selection")}
          className={`rounded px-2 py-1 text-xs font-medium ${
            scope === "selection" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          Selection
        </button>
        <button
          onClick={() => setScope("document")}
          className={`rounded px-2 py-1 text-xs font-medium ${
            scope === "document" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          Full Document
        </button>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={status === "running"}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {status === "running" ? "Analyzing..." : "Run Full Analysis"}
      </button>

      {error && <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</div>}

      {result && (
        <div className="space-y-3">
          {result.review && (
            <section className="rounded border border-gray-200 p-2">
              <h4 className="mb-1 text-xs font-semibold text-gray-600">Review Summary</h4>
              <p className="text-xs text-gray-700">{result.review.summary}</p>
              {result.review.issues && result.review.issues.length > 0 && (
                <p className="mt-1 text-xs text-amber-600">{result.review.issues.length} issue(s) found</p>
              )}
            </section>
          )}
          {result.research && (
            <section className="rounded border border-gray-200 p-2">
              <h4 className="mb-1 text-xs font-semibold text-gray-600">Research Report</h4>
              <p className="whitespace-pre-wrap text-xs text-gray-700">{result.research.report}</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
