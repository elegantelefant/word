import { useEffect, useRef } from "react";

export function useRefreshOnActive(
  active: boolean,
  refresh: () => void | Promise<void>,
) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (active) {
      void refreshRef.current();
    }
  }, [active]);
}