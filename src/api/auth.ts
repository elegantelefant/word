// ABOUTME: Auth module — opens Office dialog (or a host's registered popup, e.g. Teams) for Elefant login.
// ABOUTME: Uses BetterAuth flow via popup (Office.context.ui.displayDialogAsync); keeps the JWT in localStorage.

import { isOfficeReady } from "@/lib/office";
import { API_URL } from "./client";
const TOKEN_KEY = "elefant_token";

// Auth lives in the web app, outside the versioned API: this page signs the user in,
// then hands the token back over Office.context.ui.messageParent.
const SIGN_IN_URL = `${new URL(API_URL).origin}/integrations/word/callback`;

// Office requires a dialog's first page on the pane's own domain; this page redirects to SIGN_IN_URL.
const DIALOG_START_PATH = "/sign-in.html";

export function getSavedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Reads the JWT expiry as epoch milliseconds; this does not verify its signature. */
export function tokenExpiresAt(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    return typeof exp === "number" && Number.isFinite(exp * 1000)
      ? exp * 1000
      : null;
  } catch {
    return null;
  }
}

// A host whose sign-in popup may only open from a user's click (Teams: lib/teams.ts) registers it
// here, so the Word pane never loads that host's SDK and the refresh timer leaves re-sign-in to the user.
let clickOnlySignIn: (() => Promise<string>) | null = null;

export function setClickOnlySignIn(signIn: (() => Promise<string>) | null): void {
  clickOnlySignIn = signIn;
}

export function signInNeedsClick(): boolean {
  return clickOnlySignIn !== null;
}

/**
 * Opens the Elefant login page in an Office dialog.
 * The dialog posts back a token via Office.context.ui.messageParent().
 * Falls back to window.open() outside Office.
 * A host that registered a click-only sign-in (Teams) uses that instead.
 */
export function openLoginDialog(): Promise<string> {
  if (clickOnlySignIn) {
    return clickOnlySignIn().then((token) => {
      saveToken(token);
      return token;
    });
  }
  if (isOfficeReady() && Office.context?.ui?.displayDialogAsync) {
    return openOfficeDialog(`${window.location.origin}${DIALOG_START_PATH}`);
  }

  return openBrowserDialog(SIGN_IN_URL);
}

function openOfficeDialog(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    Office.context.ui.displayDialogAsync(
      url,
      { height: 60, width: 30, promptBeforeOpen: false },
      (result: { status: string; value: { addEventHandler: (type: string, handler: (arg: { message?: string; origin?: string; error?: number }) => void) => void; close: () => void }; error?: { message: string } }) => {
        if (result.status !== "succeeded") {
          reject(new Error(result.error?.message ?? "Failed to open login dialog"));
          return;
        }
        const dialog = result.value;
        dialog.addEventHandler(
          "DialogMessageReceived" as string,
          (arg: { message?: string; origin?: string }) => {
            // Every message ends the dialog: the callback posts once, and a dialog left open
            // on an error is a blank window the user cannot get past (#72).
            dialog.close();
            if (arg.origin !== new URL(API_URL).origin) {
              reject(new Error("Dialog message from an unexpected origin"));
              return;
            }
            try {
              const data = JSON.parse(arg.message ?? "");
              if (data.token) {
                saveToken(data.token);
                resolve(data.token);
              } else {
                reject(new Error("No token in dialog response"));
              }
            } catch {
              reject(new Error("Invalid dialog response"));
            }
          },
        );
        dialog.addEventHandler("DialogEventReceived" as string, () => {
          reject(new Error("Login dialog was closed"));
        });
      },
    );
  });
}

function openBrowserDialog(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popup = window.open(url, "elefant-login", "width=500,height=600");
    if (!popup) {
      reject(new Error("Popup blocked"));
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener("message", handler);
      popup.close();
      reject(new Error("Login timed out"));
    }, 300_000);

    const handler = (event: MessageEvent) => {
      if (event.origin !== new URL(API_URL).origin) return;
      const data = event.data;
      if (data?.token) {
        clearTimeout(timeoutId);
        window.removeEventListener("message", handler);
        saveToken(data.token);
        popup.close();
        resolve(data.token);
      }
    };

    window.addEventListener("message", handler);
  });
}
