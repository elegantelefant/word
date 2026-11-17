// ABOUTME: Runs the tab's Pro sign-in through the real @microsoft/teams-js against a stand-in Teams host window.
// ABOUTME: The host answers the way Teams does after the Elefant callback page calls notifySuccess / notifyFailure.
// @vitest-environment-options {"url": "https://addin.elefant.legal/teams.html"}

import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { getSavedToken, openLoginDialog, setClickOnlySignIn } from "@/api/auth";

const TEAMS_ORIGIN = "https://teams.microsoft.com";
// What a Teams web host answers to initialize: frame context, client type, runtime config, SDK version.
const TEAMS_RUNTIME = JSON.stringify({ apiVersion: 4, supports: { pages: { tabs: {} }, teamsCore: {} } });

interface HostMessage {
  id: number;
  uuidAsString?: string;
  func: string;
  args: unknown[];
}

// What the host hands back when the popup's last page reports: [succeeded, result string].
// null: the popup is still open (the user has not clicked Continue on the callback page yet).
let popupOutcome: [boolean, string] | null = [true, ""];
let finishPopup: (outcome: [boolean, string]) => void = () => {};
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
      setTimeout(() => answer(host, request, ["content", "web", TEAMS_RUNTIME, "2.58.0"]));
    } else if (request.func === "authentication.authenticate") {
      authenticateCalls.push(request.args);
      finishPopup = (outcome) => answer(host, request, outcome);
      if (popupOutcome) {
        const outcome = popupOutcome;
        setTimeout(() => finishPopup(outcome));
      }
    }
  }) as Window["postMessage"];
  // The tab runs framed inside Teams: teams-js talks to window.parent.
  Object.defineProperty(window, "parent", { value: host, configurable: true });

  const { startTeams, signInWithTeams } = await import("@/lib/teams");
  expect(await startTeams()).toBe(true);
  setClickOnlySignIn(signInWithTeams);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Pro sign-in inside Teams (real teams-js, stand-in host)", () => {
  it("waits as long as the user takes to click Continue on the Elefant callback page", async () => {
    const USER_PAUSE_MS = 10 * 60_000;
    vi.useFakeTimers();
    popupOutcome = null;
    let settled = false;
    const signIn = openLoginDialog().finally(() => { settled = true; });

    await vi.advanceTimersByTimeAsync(USER_PAUSE_MS);
    expect(settled).toBe(false);

    finishPopup([true, JSON.stringify({ token: "pro.jwt.after.continue" })]);
    await expect(signIn).resolves.toBe("pro.jwt.after.continue");
  });

  it("opens a 600 x 535 popup on the tab's own sign-in start page", async () => {
    popupOutcome = [true, JSON.stringify({ token: "pro.jwt.one" })];
    await openLoginDialog();
    expect(authenticateCalls.at(-1)?.slice(0, 3)).toEqual([`${window.location.origin}/teams-sign-in.html`, 600, 535]);
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

  it("rejects a notifySuccess result without a token and keeps the previous session", async () => {
    popupOutcome = [true, JSON.stringify({ token: "pro.jwt.kept" })];
    await openLoginDialog();
    popupOutcome = [true, JSON.stringify({ error: "token_unavailable" })];
    await expect(openLoginDialog()).rejects.toThrow("Sign-in failed: token_unavailable");
    expect(getSavedToken()).toBe("pro.jwt.kept");
  });
});
