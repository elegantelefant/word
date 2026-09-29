// ABOUTME: Runs a panel's refresh when its tab becomes active, and again when `key` changes while active.
// ABOUTME: Holds the latest callback in a ref so inline callbacks don't retrigger the effect.

import { useEffect, useRef } from "react";

export function useRefreshOnActive(
  active: boolean,
  refresh: () => void | Promise<void>,
  key?: unknown,
) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (active) {
      void refreshRef.current();
    }
  }, [active, key]);
}
