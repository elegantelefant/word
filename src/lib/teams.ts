// ABOUTME: The only Teams boundary: start the Teams JS SDK and run Elefant sign-in in a Teams popup.
// ABOUTME: The popup's last page reports {"token"} or {"error"} through authentication.notifySuccess.

import { app, authentication, HostClientType } from "@microsoft/teams-js";

// Teams requires the popup's first page on the tab's own domain (listed in validDomains);
// this page redirects to the Elefant sign-in.
const SIGN_IN_START_PATH = "/teams-sign-in.html";
const POPUP_WIDTH = 600;
const POPUP_HEIGHT = 535;

// Microsoft's store rules ban upsell on mobile Teams (agent_docs/2026-11-17-teams-app.md).
const MOBILE_CLIENTS = new Set<string>([HostClientType.ios, HostClientType.ipados, HostClientType.android]);

export async function teamsClientType(): Promise<string> {
  return (await app.getContext()).app.host.clientType;
}

/** Upsell only where Teams names a client that is not mobile; an unknown client gets none. */
export function upsellAllowed(clientType: Promise<string>): Promise<boolean> {
  return clientType.then((type) => !MOBILE_CLIENTS.has(type), () => false);
}

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

/** notifyFailure carries our {"error"} JSON, or a Teams reason such as "CancelledByUser" or "FailedToOpenWindow". */
function failureReason(reason: string): string {
  try {
    const { error } = JSON.parse(reason);
    if (typeof error === "string") return error;
  } catch {
    // Not our JSON: a reason Teams itself reported.
  }
  return reason;
}

export async function signInWithTeams(): Promise<string> {
  const result = await authentication
    .authenticate({
      url: `${window.location.origin}${SIGN_IN_START_PATH}`,
      width: POPUP_WIDTH,
      height: POPUP_HEIGHT,
    })
    .catch((err: Error) => {
      throw new Error(`Sign-in failed: ${failureReason(err.message)}`);
    });
  return parseSignInResult(result);
}
