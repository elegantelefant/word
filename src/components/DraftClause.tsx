// ABOUTME: Draft one clause from a description: insert it at the cursor in Word, or show it to copy where there is no document.
// ABOUTME: The caller supplies the drafter: Elefant's API when signed in, the user's own Gemini key otherwise.

import { useState, type ReactNode } from "react";
import { getSelectedText, insertText, isOfficeReady } from "@/lib/office";
import { ApiError } from "@/api/client";
import { isPlanLimit } from "@/lib/plan-features";
import { PRICING_URL, useUpsell } from "@/store/upsell";

const DRAFT_INSERTED_NOTICE = "Inserted at the cursor. Undo with Ctrl+Z (Cmd+Z on Mac).";
const OUTSIDE_WORD = "Drafting needs Microsoft Word: open Elefant from the Word ribbon.";
const COPIED_NOTICE = "Copied.";
const COPY_FAILED = "Couldn't copy. Select the draft and copy it yourself.";

interface DraftClauseProps {
  draft: (prompt: string, context: string) => Promise<string>;
  // Why drafting cannot run yet (for example, no Gemini key); disables the button.
  unavailable?: ReactNode;
  // No document to insert into (Teams): draft from the description alone and show the result to copy.
  copy?: boolean;
}

export function DraftClause({ draft, unavailable, copy = false }: DraftClauseProps) {
  const [prompt, setPrompt] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planLimit, setPlanLimit] = useState(false);
  const [drafted, setDrafted] = useState<string | null>(null);
  const upsell = useUpsell();

  async function handleDraft() {
    const description = prompt.trim();
    if (!description) return;
    if (!copy && !isOfficeReady()) {
      setError(OUTSIDE_WORD);
      return;
    }
    setDrafting(true);
    setError(null);
    setPlanLimit(false);
    setNotice(null);
    setDrafted(null);
    try {
      if (copy) {
        setDrafted(await draft(description, ""));
        return;
      }
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

  async function handleCopy(text: string) {
    setError(null);
    setNotice(null);
    try {
      await navigator.clipboard.writeText(text);
      setNotice(COPIED_NOTICE);
    } catch {
      setError(COPY_FAILED);
    }
  }

  return (
    <div className="space-y-1.5">
      <textarea
        value={prompt}
        onChange={(e) => {
          setPrompt(e.target.value);
          setDrafted(null);
          setNotice(null);
        }}
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
      {drafted && (
        <div className="space-y-1.5 rounded border border-gray-200 p-2">
          <p className="whitespace-pre-wrap text-xs text-gray-700">{drafted}</p>
          <button
            type="button"
            onClick={() => void handleCopy(drafted)}
            className="rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
          >
            Copy
          </button>
        </div>
      )}
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
