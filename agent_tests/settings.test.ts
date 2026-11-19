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
    expect(settings.model).toBe("gemini-4-hydrogen");
  });

  it("persists and loads settings", () => {
    const settings: Settings = { apiKey: "sk-test", model: "gemini-3.8-flash" };
    saveSettings(settings);

    const loaded = loadSettings();
    expect(loaded.apiKey).toBe("sk-test");
    expect(loaded.model).toBe("gemini-3.8-flash");
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
    expect(settings.model).toBe("gemini-4-hydrogen");
  });
});

describe("saved model Google no longer serves", () => {
  it("loads the default instead of a model that is not in the picker (#71)", () => {
    localStorage.setItem("elefant_settings", JSON.stringify({ apiKey: "sk-test", model: "gemini-2.5-flash" }));
    expect(loadSettings().model).toBe("gemini-4-hydrogen");
  });
});
