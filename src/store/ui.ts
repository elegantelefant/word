// ABOUTME: UI context for sharing navigation callbacks across components.
// ABOUTME: Lets child panels trigger settings panel, tab switches, etc.

import { createContext, useContext } from "react";

export interface UIContextValue {
  openSettings: () => void;
}

export const UIContext = createContext<UIContextValue | null>(null);

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIContext");
  return ctx;
}
