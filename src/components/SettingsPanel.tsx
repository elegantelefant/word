// ABOUTME: Settings panel for BYOK key input, model selection, and account info.
// ABOUTME: Slides over the main content when the settings gear is clicked.

import { useState } from "react";
import { useSettings } from "@/store/settings";
import { useAuth } from "@/store/auth";

const MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
];

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings();
  const { tier, user, logout } = useAuth();
  const [keyVisible, setKeyVisible] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <span className="text-sm font-semibold text-gray-800">Settings</span>
        <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Close">
          <XIcon />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {/* Account section */}
        {tier === "paid" && user && (
          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">Account</h4>
            <p className="text-sm text-gray-700">{user.user.name}</p>
            <p className="text-xs text-gray-500">{user.org.name}</p>
            <button onClick={logout} className="mt-2 text-xs text-red-500 hover:text-red-700">
              Sign out
            </button>
          </section>
        )}

        {/* BYOK section — only for free tier */}
        {tier === "free" && (
          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">API Key (BYOK)</h4>
            <div className="relative">
              <input
                type={keyVisible ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) => updateSettings({ apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full rounded border border-gray-300 px-2 py-1.5 pr-8 text-xs focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={() => setKeyVisible(!keyVisible)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label={keyVisible ? "Hide key" : "Show key"}
              >
                {keyVisible ? "Hide" : "Show"}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">Your key is stored locally, never sent to Elefant.</p>
          </section>
        )}

        {/* Model selection — only for free tier */}
        {tier === "free" && (
          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">Model</h4>
            <select
              value={settings.model}
              onChange={(e) => updateSettings({ model: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* Sign in link for free users */}
        {tier === "free" && (
          <section className="border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-500">
              Have an Elefant account?{" "}
              <a href="https://elefant.legal/login" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Sign in
              </a>{" "}
              for full features.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  );
}
