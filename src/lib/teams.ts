// ABOUTME: The only Teams boundary: start the Teams JS SDK and run Elefant sign-in in a Teams popup.
// ABOUTME: The popup's last page reports {"token"} or {"error"} through authentication.notifySuccess.

import { app, authentication } from "@microsoft/teams-js";

// Teams requires the popup's first page on the tab's own domain (listed in validDomains);
// this page redirects to the Elefant sign-in.
const SIGN_IN_START_PATH = "/teams-sign-in.html";
const POPUP_WIDTH = 600;
const POPUP_HEIGHT = 535;

/** Resolves false outside a Teams host, where app.initialize rejects. */
export function startTeams(): Promise<boolean> {
  return app.initialize().then(() => true, () => false);
}

export function parseSignInResult(result: string): string {
  let data: { token?: unknown; error?: unknown };
  try {
    data = JSON.parse(result);
  } catch {
    throw new Error("Sign-in returned an unreadable result");
  }
  if (typeof data.token === "string" && data.token) return data.token;
  throw new Error(`Sign-in failed: ${String(data.error ?? "no token")}`);
}

export async function signInWithTeams(): Promise<string> {
  const result = await authentication.authenticate({
    url: `${window.location.origin}${SIGN_IN_START_PATH}`,
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
  });
  return parseSignInResult(result);
}
