// ABOUTME: Tests for auth token persistence (save, load, clear).
// ABOUTME: Verifies localStorage round-trip for JWT tokens.

import { describe, it, expect, beforeEach } from "vitest";
import { getSavedToken, saveToken, clearToken } from "@/api/auth";

beforeEach(() => {
  localStorage.clear();
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
