// ABOUTME: Tests for settings store — load, save, persistence.
// ABOUTME: Verifies localStorage round-trip and defaults.

import { describe, it, expect, beforeEach } from "vitest";
import { loadSettings, saveSettings, type Settings } from "@/store/settings";

beforeEach(() => {
  localStorage.clear();
});

describe("settings store", () => {
  it("returns defaults when localStorage is empty", () => {
    const settings = loadSettings();
    expect(settings.apiKey).toBe("");
    expect(settings.model).toBe("claude-sonnet-4-20250514");
  });

  it("persists and loads settings", () => {
    const settings: Settings = { apiKey: "sk-test", model: "gpt-4o" };
    saveSettings(settings);

    const loaded = loadSettings();
    expect(loaded.apiKey).toBe("sk-test");
    expect(loaded.model).toBe("gpt-4o");
  });

  it("handles corrupt localStorage gracefully", () => {
    localStorage.setItem("elefant_settings", "not json");
    const settings = loadSettings();
    expect(settings.apiKey).toBe("");
  });

  it("fills missing fields with defaults", () => {
    localStorage.setItem("elefant_settings", JSON.stringify({ apiKey: "sk-partial" }));
    const settings = loadSettings();
    expect(settings.apiKey).toBe("sk-partial");
    expect(settings.model).toBe("claude-sonnet-4-20250514");
  });
});
