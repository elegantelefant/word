// ABOUTME: Root app component with auth/settings providers and tab routing.
// ABOUTME: Manages global state, settings overlay, and active panel display.

import { useState, useCallback, useMemo } from "react";
import { Layout, type TabId } from "./components/Layout";
import { SettingsPanel } from "./components/SettingsPanel";
import { ReviewPanel } from "./components/panels/ReviewPanel";
import { ClausesPanel } from "./components/panels/ClausesPanel";
import { MammothPanel } from "./components/panels/MammothPanel";
import { FullAnalysisPanel } from "./components/panels/FullAnalysisPanel";
import { HistoryPanel } from "./components/panels/HistoryPanel";
import { SettingsContext, loadSettings, saveSettings, type Settings } from "./store/settings";
import { AuthContext } from "./store/auth";
import { useAuthProvider } from "./hooks/useAuth";

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

  // Auth state (handles saved token, login dialog, tier detection)
  const auth = useAuthProvider();

  // UI state
  const [activeTab, setActiveTab] = useState<TabId>("review");
  const [showSettings, setShowSettings] = useState(false);

  return (
    <SettingsContext value={settingsValue}>
      <AuthContext value={auth}>
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
      return <ClausesPanel />;
    case "mammoth":
      return <MammothPanel />;
    case "analysis":
      return <FullAnalysisPanel />;
    case "history":
      return <HistoryPanel />;
  }
}
