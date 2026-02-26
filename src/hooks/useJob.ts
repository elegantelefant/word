// ABOUTME: Hook for polling an Elefant API async job until completion.
// ABOUTME: Returns job state, result, and abort function.

import { useState, useCallback, useRef } from "react";
import type { JobResult } from "@/types/api";
import { pollForResult } from "@/lib/polling";

type JobState = "idle" | "polling" | "completed" | "failed";

interface UseJobResult {
  state: JobState;
  result: JobResult | null;
  error: string | null;
  poll: (jobId: string, token: string) => Promise<JobResult>;
  reset: () => void;
}

export function useJob(): UseJobResult {
  const [state, setState] = useState<JobState>("idle");
  const [result, setResult] = useState<JobResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const poll = useCallback(async (jobId: string, token: string): Promise<JobResult> => {
    setState("polling");
    setError(null);
    setResult(null);
    abortRef.current = false;

    try {
      const r = await pollForResult(jobId, token);
      if (abortRef.current) throw new Error("Aborted");
      setResult(r);
      setState("completed");
      return r;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Job failed";
      setError(msg);
      setState("failed");
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setState("idle");
    setResult(null);
    setError(null);
  }, []);

  return { state, result, error, poll, reset };
}
