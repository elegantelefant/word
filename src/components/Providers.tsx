// ABOUTME: The state every task pane shares — BYOK settings, Elefant sign-in, the Settings overlay.
// ABOUTME: Word's App and Outlook's OutlookApp both render inside it; the overlay replaces the pane while open.

import { useState, useCallback, useMemo, type ReactNode } from "react";
import { SettingsPanel } from "./SettingsPanel";
import { SettingsContext, loadSettings, saveSettings, type Settings } from "@/store/settings";
import { AuthContext } from "@/store/auth";
import { UIContext } from "@/store/ui";
import { useAuthProvider } from "@/hooks/useAuth";

export function Providers({ children }: { children: (openSettings: () => void) => ReactNode }) {
  // Settings state
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);
  const settingsValue = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);

  // Auth state (handles saved token, login dialog, tier detection)
  const auth = useAuthProvider();

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const openSettings = useCallback(() => setShowSettings(true), []);
  const uiValue = useMemo(() => ({ openSettings }), [openSettings]);

  return (
    <SettingsContext value={settingsValue}>
      <AuthContext value={auth}>
        <UIContext value={uiValue}>
          {showSettings ? <SettingsPanel onClose={() => setShowSettings(false)} /> : children(openSettings)}
        </UIContext>
      </AuthContext>
    </SettingsContext>
  );
}
