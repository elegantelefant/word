// ABOUTME: Tests for the Teams tab's shell: first-run way forward and the page shown before the script runs.
// ABOUTME: Renders the real TeamsApp with no saved session; reads teams.html as served.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { TeamsApp } from "@/TeamsApp";

describe("TeamsApp", () => {
  it("shows a signed-out user where to sign up for an Elefant account", () => {
    render(<TeamsApp />);
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "https://elefant.legal/sign-up",
    );
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
