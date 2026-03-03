// ABOUTME: Tests for auth store context — useAuth hook and tier detection.
// ABOUTME: Verifies context throws without provider and AuthState defaults.

import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthContext, useAuth, AUTH_INITIAL, type AuthContextValue } from "@/store/auth";

describe("AUTH_INITIAL", () => {
  it("defaults to free tier with no token", () => {
    expect(AUTH_INITIAL.token).toBeNull();
    expect(AUTH_INITIAL.user).toBeNull();
    expect(AUTH_INITIAL.tier).toBe("free");
    expect(AUTH_INITIAL.loading).toBe(false);
  });
});

describe("useAuth", () => {
  it("throws when used outside AuthContext provider", () => {
    function BadConsumer() {
      useAuth();
      return <div />;
    }

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<BadConsumer />)).toThrow("useAuth must be used within AuthProvider");
    spy.mockRestore();
  });

  it("returns auth context when inside provider", () => {
    const value: AuthContextValue = {
      token: "tok-123",
      user: null,
      tier: "paid",
      loading: false,
      login: async () => {},
      logout: () => {},
    };

    function Consumer() {
      const auth = useAuth();
      return <div data-testid="tier">{auth.tier}</div>;
    }

    render(
      <AuthContext value={value}>
        <Consumer />
      </AuthContext>,
    );

    expect(screen.getByTestId("tier").textContent).toBe("paid");
  });

  it("provides login and logout functions", async () => {
    const loginFn = vi.fn();
    const logoutFn = vi.fn();

    const value: AuthContextValue = {
      ...AUTH_INITIAL,
      login: loginFn,
      logout: logoutFn,
    };

    function Consumer() {
      const auth = useAuth();
      return (
        <div>
          <button onClick={() => void auth.login()}>login</button>
          <button onClick={auth.logout}>logout</button>
        </div>
      );
    }

    render(
      <AuthContext value={value}>
        <Consumer />
      </AuthContext>,
    );

    await act(async () => {
      screen.getByText("login").click();
    });
    expect(loginFn).toHaveBeenCalled();

    act(() => {
      screen.getByText("logout").click();
    });
    expect(logoutFn).toHaveBeenCalled();
  });
});
