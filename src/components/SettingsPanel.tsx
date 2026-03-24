// ABOUTME: Settings panel for BYOK key input, model selection, and account info.
// ABOUTME: Slides over the main content when the settings gear is clicked.

import { useState } from "react";
import { useSettings } from "@/store/settings";
import { useAuth } from "@/store/auth";

const MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings();
  const { tier, user, login, logout } = useAuth();
  const [keyVisible, setKeyVisible] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
        <span className="text-sm font-semibold text-gray-800">Settings</span>
        <button onClick={onClose} className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
          <XIcon />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-3">
        {/* Account section */}
        {tier === "paid" && user && (
          <section className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Account</h4>
            <p className="text-sm font-medium text-gray-700">{user.user.name}</p>
            <p className="text-xs text-gray-500">{user.org.name}</p>
            <button onClick={logout} className="mt-2.5 text-xs text-red-500 transition-colors hover:text-red-700">
              Sign out
            </button>
          </section>
        )}

        {/* BYOK section — only for free tier */}
        {tier === "free" && (
          <section>
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">API Key (BYOK)</h4>
            <div className="relative">
              <input
                type={keyVisible ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) => updateSettings({ apiKey: e.target.value })}
                placeholder="AIza..."
                className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 pr-12 text-xs transition-colors focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
              <button
                onClick={() => setKeyVisible(!keyVisible)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label={keyVisible ? "Hide key" : "Show key"}
              >
                {keyVisible ? "Hide" : "Show"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
              Get a free key from{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-blue-500 hover:underline">
                Google AI Studio
              </a>
              . Stored locally, never sent to Elefant.
            </p>
          </section>
        )}

        {/* Model selection — only for free tier */}
        {tier === "free" && (
          <section>
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Model</h4>
            <select
              value={settings.model}
              onChange={(e) => updateSettings({ model: e.target.value })}
              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs transition-colors focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* Sign in for free users */}
        {tier === "free" && (
          <section className="border-t border-gray-100 pt-4">
            <p className="mb-2.5 text-xs leading-relaxed text-gray-500">Have an Elefant account? Sign in for full features.</p>
            <button
              onClick={() => void login()}
              className="w-full rounded-md bg-blue-600 px-3 py-2.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Sign in to Elefant
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  );
}
