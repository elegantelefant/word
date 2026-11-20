// ABOUTME: React context for BYOK settings — API key, model preference.
// ABOUTME: Persists to localStorage so free-tier users keep their config.

import { createContext, useContext } from "react";
import { DEFAULT_MODEL, isListedModel } from "@/lib/models";

export interface Settings {
  apiKey: string;
  model: string;
}

export interface SettingsContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

const STORAGE_KEY = "elefant_settings";

// Separate from the stored credentials: acknowledgement contains only a SHA-256 fingerprint.
const GOOGLE_ACK_PREFIX = "elefant_google_notice_ack_";

export async function googleKeyHash(apiKey: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hasGoogleAcknowledgement(hash: string): boolean {
  try {
    return localStorage.getItem(GOOGLE_ACK_PREFIX + hash) === "1";
  } catch {
    return false;
  }
}

export function acknowledgeGoogleKey(hash: string): void {
  localStorage.setItem(GOOGLE_ACK_PREFIX + hash, "1");
}


export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return {
        apiKey: parsed.apiKey ?? "",
        // A model dropped from the picker (#71) would 404 on every review.
        model: parsed.model && isListedModel(parsed.model) ? parsed.model : DEFAULT_MODEL,
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
