// ABOUTME: Shared SVG icon components used across the app.
// ABOUTME: Single source of truth for ElefantLogo, SettingsIcon, LockIcon.

export function ElefantLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#3b82f6" opacity="0.1" />
      <circle cx="12" cy="12" r="11" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
      <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#3b82f6">e</text>
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M6.5 1.5h3l.5 2 1.5.7 1.8-1 2 2-1 1.8.7 1.5 2 .5v3l-2 .5-.7 1.5 1 1.8-2 2-1.8-1-1.5.7-.5 2h-3l-.5-2-1.5-.7-1.8 1-2-2 1-1.8-.7-1.5-2-.5v-3l2-.5.7-1.5-1-1.8 2-2 1.8 1 1.5-.7z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

export function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="4" y="9" width="12" height="9" rx="2" />
      <path d="M7 9V6a3 3 0 016 0v3" />
    </svg>
  );
}
