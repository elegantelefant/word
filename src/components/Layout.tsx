// ABOUTME: Main layout with header, tab bar, and content area.
// ABOUTME: Sized for Office task pane (~320px wide).

import type { ReactNode } from "react";
import { useAuth } from "@/store/auth";

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

      {tier !== "paid" && (
        <button
          onClick={onSettingsClick}
          className="flex w-full items-center justify-center gap-1 border-b border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] text-blue-700 transition-colors hover:bg-blue-100"
        >
          <LockIcon />
          <span>Unlock all features — Sign in</span>
        </button>
      )}

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
                {locked && <LockIcon />}
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

function ElefantLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#3b82f6" opacity="0.1" />
      <circle cx="12" cy="12" r="11" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
      <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#3b82f6">e</text>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
      <rect x="3" y="8" width="10" height="7" rx="1.5" />
      <path d="M5 8V5.5a3 3 0 016 0V8" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
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
