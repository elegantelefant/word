// ABOUTME: Tests drafting in the Teams tab: draft from a typed description, show it, copy it; no plans link on mobile.
// ABOUTME: Renders the real TeamsApp; only fetch (the HTTP boundary) and the clipboard are replaced.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeamsApp } from "@/TeamsApp";
import { upsellAllowed } from "@/lib/teams";

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

// The proxy's relayed quota refusal, as plan-gates.test.tsx pins it.
const overQuota = () =>
  new Response(JSON.stringify({
    error: true, statusCode: 429, statusMessage: "backend_error", message: "backend_error",
    data: { error: true, upstream_status: 429, code: "QUOTA_EXCEEDED", message: "You have used this month's drafts.", path: "/api/v1/draft", detail: { reason: "over_plan_quota" } },
  }), { status: 429 });

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Teams tab drafting", () => {
  it("drafts in Teams without asking for Word", async () => {
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

  it("clears the draft once the description changes, so a stale draft is never copied", async () => {
    stubElefant(ME);
    render(<TeamsApp />);
    await draftInTeams();
    fireEvent.change(screen.getByLabelText("Draft a clause"), { target: { value: "a governing law clause" } });
    expect(screen.queryByText("DRAFTED CLAUSE")).not.toBeInTheDocument();
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

  it("shows a draft refused for the plan's limit without a plans link on mobile", async () => {
    // apiFetch logs every refusal; this one is expected, so the log is captured, not printed.
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubElefant(ME);
    const elefant = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).endsWith("/draft") ? overQuota() : elefant(input, init));
    render(<TeamsApp upsell={false} />);
    await screen.findByRole("button", { name: "Settings" });
    fireEvent.change(screen.getByLabelText("Draft a clause"), { target: { value: "a mutual NDA term" } });
    fireEvent.click(screen.getByRole("button", { name: "Draft clause" }));
    await screen.findByText("You have used this month's drafts.");
    expect(screen.queryByRole("link", { name: /plans/i })).not.toBeInTheDocument();
  });
});

describe("upsellAllowed", () => {
  it.each(["ios", "ipados", "android"])("allows no upsell on %s", async (clientType) => {
    expect(await upsellAllowed(Promise.resolve(clientType))).toBe(false);
  });

  it.each(["desktop", "web", "macos"])("allows upsell on %s", async (clientType) => {
    expect(await upsellAllowed(Promise.resolve(clientType))).toBe(true);
  });

  it("allows no upsell when Teams cannot name its client", async () => {
    expect(await upsellAllowed(Promise.reject(new Error("no context")))).toBe(false);
  });
});
