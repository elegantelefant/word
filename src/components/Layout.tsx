// ABOUTME: Main layout with header, tab bar, and content area.
// ABOUTME: Sized for Office task pane (~320px wide).

import type { ReactNode } from "react";

export type TabId = "review" | "clauses" | "mammoth" | "analysis" | "history";

interface Tab {
  id: TabId;
  label: string;
  disabled?: boolean;
}

const TABS: Tab[] = [
  { id: "review", label: "Review" },
  { id: "clauses", label: "Clauses" },
  { id: "mammoth", label: "Mammoth" },
  { id: "analysis", label: "Analysis" },
  { id: "history", label: "History" },
];

interface LayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onSettingsClick: () => void;
  children: ReactNode;
}

export function Layout({ activeTab, onTabChange, onSettingsClick, children }: LayoutProps) {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <span className="text-sm font-semibold text-gray-800">Elefant</span>
        <button
          onClick={onSettingsClick}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Settings"
        >
          <SettingsIcon />
        </button>
      </header>

      <nav className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={`flex-1 px-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-blue-600 text-blue-600"
                : tab.disabled
                  ? "cursor-not-allowed text-gray-300"
                  : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-3">{children}</main>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6.5 1.5h3l.5 2 1.5.7 1.8-1 2 2-1 1.8.7 1.5 2 .5v3l-2 .5-.7 1.5 1 1.8-2 2-1.8-1-1.5.7-.5 2h-3l-.5-2-1.5-.7-1.8 1-2-2 1-1.8-.7-1.5-2-.5v-3l2-.5.7-1.5-1-1.8 2-2 1.8 1 1.5-.7z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}
