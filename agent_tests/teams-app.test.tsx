// ABOUTME: Tests for the Teams tab's shell: first-run way forward and the page shown before the script runs.
// ABOUTME: Renders the real TeamsApp; reads teams.html as served.

import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { TeamsApp } from "@/TeamsApp";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("TeamsApp", () => {
  it("shows a signed-out user where to sign up for an Elefant account", () => {
    render(<TeamsApp />);
    expect(screen.getByRole("link", { name: /Sign up/ })).toHaveAttribute("href", "https://elefant.legal/sign-up");
  });

  it("marks the sign-up link as leaving Teams with a pop-out icon", () => {
    render(<TeamsApp />);
    const link = screen.getByRole("link", { name: /Sign up/ });
    expect(within(link).getByRole("img", { name: "Opens outside Teams" })).toBeInTheDocument();
  });

  it("does not offer sign-up while a returning user's saved session is still being checked", () => {
    // The profile request never answers, so the session stays in its checking state.
    vi.stubGlobal("fetch", () => new Promise(() => {}));
    localStorage.setItem("elefant_token", "saved.jwt.token");
    render(<TeamsApp />);
    expect(screen.queryByRole("link", { name: /Sign up/ })).not.toBeInTheDocument();
  });

  it("does not repeat the app name Teams already shows above the tab", () => {
    render(<TeamsApp />);
    expect(screen.queryByText("Elefant", { exact: true })).not.toBeInTheDocument();
  });
});

describe("teams.html", () => {
  it("shows a loading message until the tab's script replaces it", () => {
    expect(readFileSync("teams.html", "utf8")).toMatch(/<div id="root">\s*<p[^>]*>Loading Elefant…<\/p>\s*<\/div>/);
  });
});
