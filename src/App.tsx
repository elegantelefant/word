// ABOUTME: Word task pane root: the shared providers, the tab bar and the active panel.
// ABOUTME: Keeps the active tab across the Settings overlay.

import { useState } from "react";
import { Layout, type TabId } from "./components/Layout";
import { Providers } from "./components/Providers";
import { SendNoticeProvider } from "./components/SendNotice";
import { ReviewPanel } from "./components/panels/ReviewPanel";
import { ClausesPanel } from "./components/panels/ClausesPanel";
import { MammothPanel } from "./components/panels/MammothPanel";
import { FullAnalysisPanel } from "./components/panels/FullAnalysisPanel";
import { CitationsPanel } from "./components/panels/CitationsPanel";
import { HistoryPanel } from "./components/panels/HistoryPanel";
import { isFullAnalysisEnabled } from "./lib/features";

export function App() {
  // The tab outlives the Settings overlay, so closing Settings returns to it.
  const [activeTab, setActiveTab] = useState<TabId>("review");

  return (
    <Providers>
      {(openSettings) => (
        <SendNoticeProvider>
          <Layout activeTab={activeTab} onTabChange={setActiveTab} onSettingsClick={openSettings}>
            <TabContent activeTab={activeTab} />
          </Layout>
        </SendNoticeProvider>
      )}
    </Providers>
  );
}

function TabContent({ activeTab }: { activeTab: TabId }) {
  const fullAnalysisEnabled = isFullAnalysisEnabled(import.meta.env.VITE_FULL_ANALYSIS);

  return (
    <>
      <TabPane active={activeTab === "review"}><ReviewPanel /></TabPane>
      <TabPane active={activeTab === "clauses"}>
        <ClausesPanel active={activeTab === "clauses"} />
      </TabPane>
      <TabPane active={activeTab === "mammoth"}>
        <MammothPanel active={activeTab === "mammoth"} />
      </TabPane>
      <TabPane active={activeTab === "citations"}><CitationsPanel /></TabPane>
      {fullAnalysisEnabled && (
        <TabPane active={activeTab === "analysis"}><FullAnalysisPanel /></TabPane>
      )}
      <TabPane active={activeTab === "history"}>
        <HistoryPanel active={activeTab === "history"} />
      </TabPane>
    </>
  );
}

function TabPane({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <div className={active ? "" : "hidden"}>{children}</div>;
}
