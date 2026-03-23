// ABOUTME: Main layout with header, tab bar, and content area.
// ABOUTME: Sized for Office task pane (~320px wide).

import type { ReactNode } from "react";
import { useAuth } from "@/store/auth";
import { ElefantLogo, SettingsIcon, LockIcon } from "./icons";

export type TabId = "review" | "clauses" | "mammoth" | "analysis" | "history";

interface Tab {
  id: TabId;
  label: string;
  disabled?: boolean;
  paidOnly?: boolean;
}

const TABS: Tab[] = [
  { id: "review", label: "Review" },
  { id: "clauses", label: "Clauses", paidOnly: true },
  { id: "mammoth", label: "Mammoth", paidOnly: true },
  { id: "analysis", label: "Analysis", paidOnly: true },
  { id: "history", label: "History" },
];

interface LayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onSettingsClick: () => void;
  children: ReactNode;
}

export function Layout({ activeTab, onTabChange, onSettingsClick, children }: LayoutProps) {
  const { tier } = useAuth();

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <ElefantLogo />
          <span className="text-sm font-semibold text-gray-800">Elefant</span>
        </div>
        <button
          onClick={onSettingsClick}
          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Settings"
        >
          <SettingsIcon />
        </button>
      </header>

      <nav className="flex border-b border-gray-200">
        {TABS.map((tab) => {
          const locked = tab.paidOnly && tier !== "paid";
          const isDisabled = tab.disabled || locked;
          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              disabled={isDisabled}
              className={`flex-1 items-center justify-center px-1 py-2.5 text-[11px] font-medium transition-colors ${
                activeTab === tab.id && !isDisabled
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : isDisabled
                    ? "cursor-not-allowed text-gray-300"
                    : "text-gray-500 hover:text-gray-700"
              }`}
              title={locked ? "Requires Elefant Pro" : undefined}
            >
              <span className="inline-flex items-center gap-0.5">
                {tab.label}
                {locked && <LockIcon size={10} />}
              </span>
            </button>
          );
        })}
      </nav>

      <main className="flex-1 overflow-y-auto p-3">{children}</main>

      <footer className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5">
        <span className="text-[10px] text-gray-400">v{__APP_VERSION__}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
          tier === "paid" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
        }`}>
          {tier === "paid" ? "Pro" : "Free"}
        </span>
      </footer>
    </div>
  );
}
