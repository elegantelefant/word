// ABOUTME: Whether this surface may mention Elefant's paid plans; on by default.
// ABOUTME: A host that bans upsell (Teams on mobile, a Teams Store rule) provides false.

import { createContext, useContext } from "react";

export const UpsellContext = createContext(true);

export function useUpsell(): boolean {
  return useContext(UpsellContext);
}
