// ABOUTME: Hook for reading Word document text (selection or full body).
// ABOUTME: Returns current text, loading state, and a refresh function.

import { useState, useCallback } from "react";
import { getSelectedText, getDocumentBody, isOfficeReady } from "@/lib/office";

interface UseDocumentResult {
  text: string;
  loading: boolean;
  error: string | null;
  readSelection: () => Promise<string>;
  readBody: () => Promise<string>;
}

export function useDocument(): UseDocumentResult {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readSelection = useCallback(async () => {
    if (!isOfficeReady()) {
      setError("Office not available");
      return "";
    }
    setLoading(true);
    setError(null);
    try {
      const t = await getSelectedText();
      setText(t ?? "");
      return t ?? "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to read selection";
      setError(msg);
      return "";
    } finally {
      setLoading(false);
    }
  }, []);

  const readBody = useCallback(async () => {
    if (!isOfficeReady()) {
      setError("Office not available");
      return "";
    }
    setLoading(true);
    setError(null);
    try {
      const t = await getDocumentBody();
      setText(t);
      return t;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to read document";
      setError(msg);
      return "";
    } finally {
      setLoading(false);
    }
  }, []);

  return { text, loading, error, readSelection, readBody };
}
