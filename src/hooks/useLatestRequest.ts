// ABOUTME: Tags each run of an async load so only the most recent run may write state.
// ABOUTME: `begin()` starts a run and returns its `isLatest()` check.

import { useCallback, useRef } from "react";

export function useLatestRequest() {
  const latest = useRef(0);

  return useCallback(() => {
    const run = ++latest.current;
    return () => run === latest.current;
  }, []);
}
