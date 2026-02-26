// ABOUTME: Root app component with auth/settings providers and tab routing.
// ABOUTME: Manages global state, settings overlay, and active panel display.

import { useState, useCallback, useMemo } from "react";
import { Layout, type TabId } from "./components/Layout";
import { SettingsPanel } from "./components/SettingsPanel";
import { ReviewPanel } from "./components/panels/ReviewPanel";
import { UpgradePrompt } from "./components/UpgradePrompt";
import { SettingsContext, loadSettings, saveSettings, type Settings } from "./store/settings";
import { AuthContext, AUTH_INITIAL, type AuthState } from "./store/auth";
import type { MeResponse, Tier } from "./types/api";
import { getMe } from "./api/account";

export function App() {
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

  // Auth state
  const [auth, setAuth] = useState<AuthState>(AUTH_INITIAL);

  const login = useCallback(async (token: string) => {
    setAuth((prev) => ({ ...prev, loading: true }));
    try {
      const user = await getMe(token);
      const tier: Tier = determineTier(user);
      setAuth({ token, user, tier, loading: false });
    } catch {
      setAuth((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const logout = useCallback(() => {
    setAuth(AUTH_INITIAL);
  }, []);

  const authValue = useMemo(
    () => ({ ...auth, login, logout }),
    [auth, login, logout],
  );

  // UI state
  const [activeTab, setActiveTab] = useState<TabId>("review");
  const [showSettings, setShowSettings] = useState(false);

  return (
    <SettingsContext value={settingsValue}>
      <AuthContext value={authValue}>
        {showSettings ? (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        ) : (
          <Layout activeTab={activeTab} onTabChange={setActiveTab} onSettingsClick={() => setShowSettings(true)}>
            <TabContent tab={activeTab} />
          </Layout>
        )}
      </AuthContext>
    </SettingsContext>
  );
}

function TabContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case "review":
      return <ReviewPanel />;
    case "clauses":
      return <UpgradePrompt feature="Clause Search" />;
    case "mammoth":
      return <UpgradePrompt feature="Mammoth" />;
    case "analysis":
      return <UpgradePrompt feature="Full Analysis" />;
    case "history":
      return <UpgradePrompt feature="History" />;
  }
}

function determineTier(me: MeResponse): Tier {
  const accountType = me.org.account_type?.toLowerCase();
  if (accountType === "free" || accountType === "trial") return "free";
  return "paid";
}
