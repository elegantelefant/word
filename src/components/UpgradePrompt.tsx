// ABOUTME: Paywall component shown to free-tier users on paid features.
// ABOUTME: Displays upgrade CTA and optional "Use Tauri companion" link.

import { LockIcon } from "./icons";

interface UpgradePromptProps {
  feature: string;
}

export function UpgradePrompt({ feature }: UpgradePromptProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
        <LockIcon size={22} />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-gray-800">{feature} requires Elefant Pro</h3>
        <p className="max-w-[240px] text-xs leading-relaxed text-gray-500">
          Sign in to your Elefant account to access {feature.toLowerCase()}, or use the Elefant desktop app.
        </p>
      </div>
      <a
        href="https://elefant.legal/pricing"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 rounded-md bg-blue-600 px-5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        Upgrade to Pro
      </a>
    </div>
  );
}
