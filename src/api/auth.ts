// ABOUTME: Auth module — opens Office dialog for Elefant login, exchanges for JWT.
// ABOUTME: Uses BetterAuth flow via popup (Office.context.ui.displayDialogAsync).

import { isOfficeReady } from "@/lib/office";

const API_URL = import.meta.env.VITE_API_URL || "https://api.elefant.legal";
const TOKEN_KEY = "elefant_token";

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

/**
 * Opens the Elefant login page in an Office dialog.
 * The dialog posts back a token via Office.context.ui.messageParent().
 * Falls back to window.open() outside Office.
 */
export function openLoginDialog(): Promise<string> {
  const loginUrl = `${API_URL}/auth/login?redirect=office-addin`;

  if (isOfficeReady() && Office.context?.ui?.displayDialogAsync) {
    return openOfficeDialog(loginUrl);
  }

  return openBrowserDialog(loginUrl);
}

function openOfficeDialog(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    Office.context.ui.displayDialogAsync(
      url,
      { height: 60, width: 30, promptBeforeOpen: false },
      (result: { status: string; value: { addEventHandler: (type: string, handler: (arg: { message: string }) => void) => void }; error?: { message: string } }) => {
        if (result.status !== "succeeded") {
          reject(new Error(result.error?.message ?? "Failed to open login dialog"));
          return;
        }
        const dialog = result.value;
        dialog.addEventHandler(
          "DialogMessageReceived" as string,
          (arg: { message: string }) => {
            try {
              const data = JSON.parse(arg.message);
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

    const handler = (event: MessageEvent) => {
      if (event.origin !== new URL(API_URL).origin) return;
      const data = event.data;
      if (data?.token) {
        window.removeEventListener("message", handler);
        saveToken(data.token);
        popup.close();
        resolve(data.token);
      }
    };

    window.addEventListener("message", handler);

    // Timeout after 5 minutes
    setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("Login timed out"));
    }, 300_000);
  });
}
