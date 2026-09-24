
import { useEffect } from "react";

export function useRefreshOnActive(
  active: boolean,
  refresh: () => void | Promise<void>,
) {
  useEffect(() => {
    if (active) {
      void refresh();
    }
  }, [active, refresh]);
}