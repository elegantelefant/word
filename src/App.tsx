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
import { UIContext } from "./store/ui";
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
  const openSettings = useCallback(() => setShowSettings(true), []);
  const uiValue = useMemo(() => ({ openSettings }), [openSettings]);

  return (
    <SettingsContext value={settingsValue}>
      <AuthContext value={auth}>
        <UIContext value={uiValue}>
          {showSettings ? (
            <SettingsPanel onClose={() => setShowSettings(false)} />
          ) : (
            <Layout activeTab={activeTab} onTabChange={setActiveTab} onSettingsClick={openSettings}>
              <TabContent activeTab={activeTab} />
            </Layout>
          )}
        </UIContext>
      </AuthContext>
    </SettingsContext>
  );
}

function TabContent({ activeTab }: { activeTab: TabId }) {
  return (
    <>
      <TabPane active={activeTab === "review"}><ReviewPanel /></TabPane>
      <TabPane active={activeTab === "clauses"}><ClausesPanel /></TabPane>      <TabPane active={activeTab === "mammoth"}>
        <MammothPanel active={activeTab === "mammoth"} />
      </TabPane>
      <TabPane active={activeTab === "analysis"}><FullAnalysisPanel /></TabPane>
      <TabPane active={activeTab === "history"}>
        <HistoryPanel active={activeTab === "history"} />
      </TabPane>    </>
  );
}

function TabPane({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <div className={active ? "" : "hidden"}>{children}</div>;
}
