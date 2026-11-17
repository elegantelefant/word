// ABOUTME: Root of the Teams personal tab: the task pane's settings, sign-in and review, without Word.
// ABOUTME: Same providers as App; one panel, because Teams has no document to select from.

import { useState, useCallback, useMemo } from "react";
import { SettingsPanel } from "./components/SettingsPanel";
import { PastedReviewPanel } from "./components/panels/PastedReviewPanel";
import { SettingsContext, loadSettings, saveSettings, type Settings } from "./store/settings";
import { AuthContext } from "./store/auth";
import { UIContext } from "./store/ui";
import { useAuthProvider } from "./hooks/useAuth";

export function TeamsApp() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);
  const settingsValue = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);

  const auth = useAuthProvider();

  const [showSettings, setShowSettings] = useState(false);
  const openSettings = useCallback(() => setShowSettings(true), []);
  const uiValue = useMemo(() => ({ openSettings }), [openSettings]);

  return (
    <SettingsContext value={settingsValue}>
      <AuthContext value={auth}>
        <UIContext value={uiValue}>
          <div className="mx-auto flex h-screen max-w-2xl flex-col">
            {showSettings ? (
              <SettingsPanel onClose={() => setShowSettings(false)} />
            ) : (
              <>
                <header className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
                  <span className="text-sm font-semibold text-gray-800">Elefant</span>
                  <button
                    onClick={openSettings}
                    className="rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    {auth.tier === "paid" ? "Settings" : "Settings & sign in"}
                  </button>
                </header>
                <main className="flex-1 overflow-y-auto p-3">
                  <PastedReviewPanel />
                </main>
              </>
            )}
          </div>
        </UIContext>
      </AuthContext>
    </SettingsContext>
  );
}
