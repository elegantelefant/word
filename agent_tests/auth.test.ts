// ABOUTME: Tests for auth token persistence (save, load, clear) and the sign-in dialog URL.
// ABOUTME: Verifies localStorage round-trip for JWT tokens and that dialog messages come from Elefant.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getSavedToken, saveToken, clearToken, openLoginDialog, tokenExpiresAt } from "@/api/auth";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("JWT expiry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T12:00:00Z"));
  });

  it("decodes exp from an unpadded base64url payload as epoch milliseconds", () => {
    const expiresAt = Date.now() + 3_600_000;
    const payload = btoa(JSON.stringify({ exp: expiresAt / 1000, note: ">>>???~~~".repeat(3) }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(payload).toMatch(/[-_]/);
    expect(payload).not.toMatch(/=$/);

    expect(tokenExpiresAt(`header.${payload}.signature`)).toBe(expiresAt);
    vi.advanceTimersByTime(30_000);
    expect(tokenExpiresAt(`header.${payload}.signature`)).toBe(expiresAt);
  });

  it("preserves an already expired timestamp, including zero", () => {
    const payload = btoa(JSON.stringify({ exp: 0 }));
    expect(tokenExpiresAt(`header.${payload}.signature`)).toBe(0);
  });

  it.each(["", "opaque-token", "header.%.signature", "header.bm90LWpzb24.signature"])(
    "returns null for an unreadable token %s", (token) => {
      expect(tokenExpiresAt(token)).toBeNull();
    },
  );

  it.each([{}, { exp: "1793797200" }, { exp: null }, { exp: true }, { exp: 1e308 }, null])(
    "returns null when the payload has no finite numeric expiry: %j", (payload) => {
      expect(tokenExpiresAt(`header.${btoa(JSON.stringify(payload))}.signature`)).toBeNull();
    },
  );
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
