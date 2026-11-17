// ABOUTME: One quiet line shown to free and Lite users on a paid-only feature.
// ABOUTME: Points to Settings to sign in and to the pricing page; no pitch where upsell is off.

import { useAuth } from "@/store/auth";
import { PRICING_URL, useUpsell } from "@/store/upsell";

interface UpgradePromptProps {
  feature: string;
}

export function UpgradePrompt({ feature }: UpgradePromptProps) {
  const { token } = useAuth();
  const upsell = useUpsell();

  if (!upsell) {
    // Signing in is not upsell: a signed-out subscriber still needs the way forward.
    return (
      <p className="py-6 text-center text-xs text-gray-500">
        {token ? `${feature} isn't included in your plan.` : `${feature} needs an Elefant sign-in. Sign in from Settings.`}
      </p>
    );
  }

  const plans = (label: string) => (
    <a href={PRICING_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
      {label}
    </a>
  );

  return (
    <p className="py-6 text-center text-xs text-gray-500">
      {feature} comes with Elefant's paid plans.{" "}
      {token ? <>{plans("See plans")}.</> : <>Sign in from Settings, or {plans("see plans")}.</>}
    </p>
  );
}
