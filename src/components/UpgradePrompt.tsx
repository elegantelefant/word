// ABOUTME: Paywall component shown to free-tier users on paid features.
// ABOUTME: Displays upgrade CTA and optional "Use Tauri companion" link.

interface UpgradePromptProps {
  feature: string;
}

export function UpgradePrompt({ feature }: UpgradePromptProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
        <LockIcon />
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

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="#3b82f6" strokeWidth="1.5">
      <rect x="4" y="9" width="12" height="9" rx="2" />
      <path d="M7 9V6a3 3 0 016 0v3" />
    </svg>
  );
}
