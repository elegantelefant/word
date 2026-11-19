// ABOUTME: Draft one clause from a description and insert it at the cursor in Word.
// ABOUTME: The caller supplies the drafter: Elefant's API when signed in, the user's own Gemini key otherwise.

import { useState, type ReactNode } from "react";
import { getSelectedText, insertText, isOfficeReady } from "@/lib/office";
import { ApiError } from "@/api/client";
import { isPlanLimit } from "@/lib/plan-features";
import { PRICING_URL, useUpsell } from "@/store/upsell";

const DRAFT_INSERTED_NOTICE = "Inserted at the cursor. Undo with Ctrl+Z (Cmd+Z on Mac).";
const OUTSIDE_WORD = "Drafting needs Microsoft Word: open Elefant from the Word ribbon.";

interface DraftClauseProps {
  draft: (prompt: string, context: string) => Promise<string>;
  // Why drafting cannot run yet (for example, no Gemini key); disables the button.
  unavailable?: ReactNode;
}

export function DraftClause({ draft, unavailable }: DraftClauseProps) {
  const [prompt, setPrompt] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planLimit, setPlanLimit] = useState(false);
  const upsell = useUpsell();

  async function handleDraft() {
    const description = prompt.trim();
    if (!description) return;
    if (!isOfficeReady()) {
      setError(OUTSIDE_WORD);
      return;
    }
    setDrafting(true);
    setError(null);
    setPlanLimit(false);
    setNotice(null);
    try {
      const selected = await getSelectedText();
      await insertText(await draft(description, selected), "end");
      setNotice(DRAFT_INSERTED_NOTICE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to draft clause");
      // Out of allowance or credits, or not in the plan: the one place a plans link is useful (#98).
      setPlanLimit(err instanceof ApiError && isPlanLimit(err.reason));
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the clause to draft..."
        aria-label="Draft a clause"
        rows={3}
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => void handleDraft()}
        disabled={!!unavailable || drafting || !prompt.trim()}
        className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {drafting ? "Drafting..." : "Draft clause"}
      </button>
      {unavailable && <p className="text-xs text-gray-500">{unavailable}</p>}
      {notice && <p className="text-xs text-green-700">{notice}</p>}
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
