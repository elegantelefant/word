// ABOUTME: Tests for auth token persistence (save, load, clear) and the sign-in dialog URL.
// ABOUTME: Verifies localStorage round-trip for JWT tokens.

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

describe("sign-in dialog", () => {
  it("opens the Elefant Word sign-in callback page, not an API path (#7)", async () => {
    let opened = "";
    vi.stubGlobal("Word", {});
    vi.stubGlobal("Office", {
      context: {
        ui: {
          displayDialogAsync: (url: string, _options: unknown, done: (result: { status: string; error: { message: string } }) => void) => {
            opened = url;
            done({ status: "failed", error: { message: "dialog closed" } });
          },
        },
      },
    });

    await expect(openLoginDialog()).rejects.toThrow("dialog closed");
    expect(opened).toBe("https://elefant.legal/integrations/word/callback");
  });
});
