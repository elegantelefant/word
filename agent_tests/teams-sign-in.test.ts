// ABOUTME: Tests for reading the Elefant token out of the Teams sign-in popup's result.
// ABOUTME: The popup's last page reports {"token"} or {"error"} through authentication.notifySuccess.

import { describe, it, expect, vi } from "vitest";
import { parseSignInResult } from "@/lib/teams";

// teams-js asks a CDN for its host-origin list on import; keep the test offline.
vi.hoisted(() => {
  vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
});

describe("parseSignInResult", () => {
  it("returns the token the popup reported", () => {
    expect(parseSignInResult('{"token":"jwt.payload.sig"}')).toBe("jwt.payload.sig");
  });

  it("raises the popup's own error when no token was minted", () => {
    expect(() => parseSignInResult('{"error":"token_unavailable"}')).toThrow("Sign-in failed: token_unavailable");
  });

  it("rejects a result that is not the popup's JSON", () => {
    expect(() => parseSignInResult("not json")).toThrow("Sign-in returned an unreadable result");
  });
});
