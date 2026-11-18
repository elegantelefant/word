// ABOUTME: Tests drafting in the Teams tab: draft from a typed description, show it, copy it; no plans link on mobile.
// ABOUTME: Renders the real TeamsApp; only fetch (the HTTP boundary) and the clipboard are replaced.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeamsApp } from "@/TeamsApp";
import { isMobileClient } from "@/lib/teams";

const ME = {
  user: { id: "u1", email: "a@b.com", name: "Lee" },
  org: { id: "o1", name: "Lee", slug: "lee", accountType: "individual" },
  entitlements: { plan: "lite", source: "none", draftRequestsMonthly: 10 },
};
const NO_DRAFT_ME = { ...ME, entitlements: { ...ME.entitlements, draftRequestsMonthly: 0 } };

function stubElefant(me: object, draftBodies: unknown[] = []) {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/me")) return new Response(JSON.stringify(me));
    if (url.endsWith("/draft")) {
      draftBodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ jobId: "j1" }));
    }
    if (url.endsWith("/jobs/j1")) return new Response(JSON.stringify({ id: "j1", status: "completed" }));
    if (url.endsWith("/jobs/j1/result")) {
      return new Response(JSON.stringify({ id: "j1", status: "completed", result: { draft: "DRAFTED CLAUSE", warnings: [] } }));
    }
    return new Response("{}");
  });
  localStorage.setItem("elefant_token", "saved.jwt.token");
}

async function draftInTeams() {
  // Signed in once the header drops "& sign in".
  await screen.findByRole("button", { name: "Settings" });
  fireEvent.change(screen.getByLabelText("Draft a clause"), { target: { value: "a mutual NDA term" } });
  fireEvent.click(screen.getByRole("button", { name: "Draft clause" }));
  await screen.findByText("DRAFTED CLAUSE");
}

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("Teams tab drafting", () => {
  it("shows the draft for a typed description, with no Word document to insert into", async () => {
    stubElefant(ME);
    render(<TeamsApp />);
    await draftInTeams();
    expect(screen.queryByText(/Drafting needs Microsoft Word/)).not.toBeInTheDocument();
  });

  it("drafts from the description alone, since Teams has no selection", async () => {
    const bodies: unknown[] = [];
    stubElefant(ME, bodies);
    render(<TeamsApp />);
    await draftInTeams();
    expect(bodies).toEqual([{ prompt: "a mutual NDA term", supplementContext: "" }]);
  });

  it("copies the draft to the clipboard", async () => {
    const copied: string[] = [];
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: async (text: string) => { copied.push(text); } } });
    stubElefant(ME);
    render(<TeamsApp />);
    await draftInTeams();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(await screen.findByText("Copied.")).toBeInTheDocument();
    expect(copied).toEqual(["DRAFTED CLAUSE"]);
  });

  it("says the draft was not copied when the clipboard refuses", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: async () => { throw new Error("denied"); } } });
    stubElefant(ME);
    render(<TeamsApp />);
    await draftInTeams();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(await screen.findByText("Couldn't copy. Select the draft and copy it yourself.")).toBeInTheDocument();
  });
});

describe("Teams tab plans link", () => {
  it("links to plans when the plan lacks drafting on desktop", async () => {
    stubElefant(NO_DRAFT_ME);
    render(<TeamsApp />);
    expect(await screen.findByRole("link", { name: "See plans" })).toBeInTheDocument();
  });

  it("names the missing feature without a plans link on mobile", async () => {
    stubElefant(NO_DRAFT_ME);
    render(<TeamsApp upsell={false} />);
    await screen.findByText("Drafting isn't included in your plan.");
    expect(screen.queryByRole("link", { name: /plans/i })).not.toBeInTheDocument();
  });
});

describe("isMobileClient", () => {
  it.each(["ios", "ipados", "android"])("treats %s as mobile", (clientType) => {
    expect(isMobileClient(clientType)).toBe(true);
  });

  it.each(["desktop", "web", "macos"])("treats %s as not mobile", (clientType) => {
    expect(isMobileClient(clientType)).toBe(false);
  });
});
