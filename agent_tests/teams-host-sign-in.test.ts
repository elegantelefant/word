// ABOUTME: Runs the tab's Pro sign-in through the real @microsoft/teams-js against a stand-in Teams host window.
// ABOUTME: The host answers the way Teams does after the Elefant callback page calls notifySuccess / notifyFailure.
// @vitest-environment-options {"url": "https://addin.elefant.legal/teams.html"}

import { describe, it, expect, beforeAll, vi } from "vitest";
import { getSavedToken, openLoginDialog, setClickOnlySignIn } from "@/api/auth";

const TEAMS_ORIGIN = "https://teams.microsoft.com";

interface HostMessage {
  id: number;
  uuidAsString?: string;
  func: string;
  args: unknown[];
}

// What the host hands back when the popup's last page reports: [succeeded, result string].
let popupOutcome: [boolean, string] = [true, ""];
const authenticateCalls: unknown[][] = [];

function answer(host: Window, request: HostMessage, args: unknown[]) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: { id: request.id, uuidAsString: request.uuidAsString, args },
      origin: TEAMS_ORIGIN,
      source: host,
    }),
  );
}

beforeAll(async () => {
  // teams-js asks a CDN for its host-origin list on import; offline it uses its built-in list.
  vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));

  const frame = document.createElement("iframe");
  document.body.append(frame);
  const host = frame.contentWindow!;
  host.postMessage = ((request: HostMessage) => {
    if (request.func === "initialize") {
      setTimeout(() => answer(host, request, ["content", "web", "2.58.0", "2.58.0"]));
    } else if (request.func === "authentication.authenticate") {
      authenticateCalls.push(request.args);
      setTimeout(() => answer(host, request, popupOutcome));
    }
  }) as Window["postMessage"];
  // A top-level page with an opener is how teams-js finds its host when it is not framed.
  Object.defineProperty(window, "opener", { value: host, configurable: true });

  const { startTeams, signInWithTeams } = await import("@/lib/teams");
  expect(await startTeams()).toBe(true);
  setClickOnlySignIn(signInWithTeams);
});

describe("Pro sign-in inside Teams (real teams-js, stand-in host)", () => {
  it("opens the popup on the tab's own sign-in start page", async () => {
    popupOutcome = [true, JSON.stringify({ token: "pro.jwt.one" })];
    await openLoginDialog();
    expect(authenticateCalls.at(-1)?.[0]).toBe(`${window.location.origin}/teams-sign-in.html`);
  });

  it("keeps the token the callback page passed to notifySuccess", async () => {
    popupOutcome = [true, JSON.stringify({ token: "pro.jwt.two" })];
    await expect(openLoginDialog()).resolves.toBe("pro.jwt.two");
    expect(getSavedToken()).toBe("pro.jwt.two");
  });

  it("reports the callback page's notifyFailure reason", async () => {
    popupOutcome = [false, JSON.stringify({ error: "token_unavailable" })];
    await expect(openLoginDialog()).rejects.toThrow("Sign-in failed: token_unavailable");
  });

  it("reports a popup the user closed", async () => {
    popupOutcome = [false, "CancelledByUser"];
    await expect(openLoginDialog()).rejects.toThrow("Sign-in failed: CancelledByUser");
  });
});
