// ABOUTME: Tests for SettingsPanel component rendering and interactions.
// ABOUTME: Verifies Gemini model picker, API key input, and sign-in button.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SettingsContext, type SettingsContextValue } from "@/store/settings";
import { AuthContext, type AuthContextValue } from "@/store/auth";
import { AUTH_INITIAL } from "@/store/auth";

const noop = () => {};
const noopAsync = async () => {};

function renderSettings(
  settingsOverrides: Partial<SettingsContextValue> = {},
  authOverrides: Partial<AuthContextValue> = {},
) {
  const settings: SettingsContextValue = {
    settings: { apiKey: "", model: "gemini-2.5-flash" },
    updateSettings: vi.fn(),
    ...settingsOverrides,
  };

  const auth: AuthContextValue = {
    ...AUTH_INITIAL,
    login: noopAsync,
    logout: noop,
    ...authOverrides,
  };

  return {
    ...render(
      <SettingsContext value={settings}>
        <AuthContext value={auth}>
          <SettingsPanel onClose={noop} />
        </AuthContext>
      </SettingsContext>,
    ),
    settings,
    auth,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("SettingsPanel", () => {
  it("renders settings header with close button", () => {
    renderSettings();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("shows Gemini models in the model picker", () => {
    renderSettings();
    const select = screen.getByRole("combobox");
    const options = [...select.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toEqual(["Gemini 2.5 Flash", "Gemini 2.5 Pro", "Gemini 2.0 Flash"]);
  });

  it("shows API key input for free tier", () => {
    renderSettings();
    expect(screen.getByPlaceholderText("AIza...")).toBeInTheDocument();
  });

  it("links to Google AI Studio", () => {
    renderSettings();
    const link = screen.getByText("Google AI Studio");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("https://aistudio.google.com/apikey");
  });

  it("warns that Google uses prompts sent with unpaid keys, linking the terms", () => {
    renderSettings();
    expect(screen.getByText(/Google uses prompts and responses sent with unpaid keys to improve its products, and human reviewers may read them/)).toBeInTheDocument();
    expect(screen.getByText("Gemini API terms").getAttribute("href")).toBe("https://ai.google.dev/gemini-api/terms");
  });

  it("calls updateSettings when model changes", () => {
    const { settings } = renderSettings();
    const select = screen.getByRole("combobox");

    fireEvent.change(select, { target: { value: "gemini-2.5-pro" } });

    expect(settings.updateSettings).toHaveBeenCalledWith({ model: "gemini-2.5-pro" });
  });

  it("calls updateSettings when API key changes", () => {
    const { settings } = renderSettings();
    const input = screen.getByPlaceholderText("AIza...");

    fireEvent.change(input, { target: { value: "AIzaSyTest123" } });

    expect(settings.updateSettings).toHaveBeenCalledWith({ apiKey: "AIzaSyTest123" });
  });

  it("shows sign-in button for free tier", () => {
    renderSettings();
    expect(screen.getByText("Sign in to Elefant")).toBeInTheDocument();
  });

  it("shows account info and sign-out for paid tier", () => {
    renderSettings({}, {
      tier: "paid",
      token: "tok-123",
      user: {
        user: { id: "u1", email: "test@acme.com", name: "Jane Doe" },
        org: { id: "o1", name: "Acme Corp", slug: "acme", account_type: "pro" },
        entitlements: {},
      },
    });

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
    // Should NOT show API key input or model picker for paid users
    expect(screen.queryByPlaceholderText("AIza...")).not.toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();

    render(
      <SettingsContext value={{ settings: { apiKey: "", model: "gemini-2.5-flash" }, updateSettings: noop }}>
        <AuthContext value={{ ...AUTH_INITIAL, login: noopAsync, logout: noop }}>
          <SettingsPanel onClose={onClose} />
        </AuthContext>
      </SettingsContext>,
    );

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});
