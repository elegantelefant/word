// ABOUTME: Tests the quiet line a free or Lite user sees on a paid-only feature.
// ABOUTME: One sentence and a "See plans" link; the upsell flag (Teams mobile) removes the pitch.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { AuthContext, AUTH_INITIAL } from "@/store/auth";
import { UpsellContext } from "@/store/upsell";

const noop = async () => {};

function renderPrompt({ token = null as string | null, upsell = true } = {}) {
  return render(
    <UpsellContext value={upsell}>
      <AuthContext value={{ ...AUTH_INITIAL, token, login: noop, logout: () => {} }}>
        <UpgradePrompt feature="Clause search and drafting" />
      </AuthContext>
    </UpsellContext>,
  );
}

describe("UpgradePrompt (#97)", () => {
  it("tells a signed-out user, in one line, to sign in or see plans", () => {
    const { container } = renderPrompt();
    expect(container.textContent).toBe("Clause search and drafting comes with Elefant's paid plans. Sign in from Settings, or see plans.");
  });

  it("tells a signed-in Lite user, in one line, to see plans", () => {
    const { container } = renderPrompt({ token: "lite-token" });
    expect(container.textContent).toBe("Clause search and drafting comes with Elefant's paid plans. See plans.");
  });

  it("links plans to the pricing page in a new tab", () => {
    renderPrompt();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://elefant.legal/pricing");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("is a quiet line, not a button-styled call to action", () => {
    renderPrompt();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("link").className).not.toMatch(/bg-blue-600/);
  });

  it("drops the plans pitch and link where upsell is off", () => {
    const { container } = renderPrompt({ upsell: false });
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.textContent).toBe("Clause search and drafting isn't available on this account.");
  });
});
