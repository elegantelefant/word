// ABOUTME: Tests for auth token persistence (save, load, clear) and the sign-in dialog URL.
// ABOUTME: Verifies localStorage round-trip for JWT tokens and that dialog messages come from Elefant.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getSavedToken, saveToken, clearToken, openLoginDialog } from "@/api/auth";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("auth token persistence", () => {
  it("returns null when no token saved", () => {
    expect(getSavedToken()).toBeNull();
  });

  it("saves and retrieves token", () => {
    saveToken("jwt-test-123");
    expect(getSavedToken()).toBe("jwt-test-123");
  });

  it("clears saved token", () => {
    saveToken("jwt-test-123");
    clearToken();
    expect(getSavedToken()).toBeNull();
  });

  it("overwrites existing token", () => {
    saveToken("old-token");
    saveToken("new-token");
    expect(getSavedToken()).toBe("new-token");
  });
});

type DialogHandler = (arg: { message?: string; origin?: string }) => void;

function stubOfficeDialog(onOpen: (url: string) => void = () => {}) {
  const handlers: Record<string, DialogHandler> = {};
  vi.stubGlobal("Word", {});
  vi.stubGlobal("Office", {
    context: {
      ui: {
        displayDialogAsync: (url: string, _options: unknown, done: (result: unknown) => void) => {
          onOpen(url);
          done({
            status: "succeeded",
            value: {
              addEventHandler: (type: string, handler: DialogHandler) => {
                handlers[type] = handler;
              },
              close: () => {},
            },
          });
        },
      },
    },
  });
  return handlers;
}

describe("sign-in dialog", () => {
  it("opens the dialog on the pane's own origin, which redirects to the Elefant callback (#53)", async () => {
    let opened = "";
    const handlers = stubOfficeDialog((url) => {
      opened = url;
    });

    const login = openLoginDialog();
    handlers.DialogMessageReceived({ origin: "https://elefant.legal", message: JSON.stringify({ token: "jwt-1" }) });

    await expect(login).resolves.toBe("jwt-1");
    expect(opened).toBe(`${window.location.origin}/sign-in.html`);
  });

  it("rejects a dialog message from an origin other than Elefant's (#53)", async () => {
    const handlers = stubOfficeDialog();

    const login = openLoginDialog();
    handlers.DialogMessageReceived({ origin: "https://evil.example", message: JSON.stringify({ token: "stolen" }) });

    await expect(login).rejects.toThrow("Dialog message from an unexpected origin");
    expect(getSavedToken()).toBeNull();
  });
});
