// ABOUTME: React context for BYOK settings — API key, model preference.
// ABOUTME: Persists to localStorage so free-tier users keep their config.

import { createContext, useContext } from "react";

export interface Settings {
  apiKey: string;
  model: string;
}

export interface SettingsContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

const STORAGE_KEY = "elefant_settings";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return {
        apiKey: parsed.apiKey ?? "",
        model: parsed.model ?? DEFAULT_MODEL,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return { apiKey: "", model: DEFAULT_MODEL };
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
