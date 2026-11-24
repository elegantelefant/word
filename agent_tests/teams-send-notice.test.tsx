// ABOUTME: Tests that the Teams tab tells people where their text goes, the same way Word's pane does.
// ABOUTME: Renders the real TeamsApp signed in to Elefant; only fetch (the HTTP boundary) is replaced.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TeamsApp } from "@/TeamsApp";

const ME = {
  user: { id: "u1", email: "a@b.com", name: "Lee" },
  org: { id: "o1", name: "Lee", slug: "lee", accountType: "individual" },
  entitlements: { plan: "lite", source: "none", draftRequestsMonthly: 10 },
};

// Every Elefant call except /me, the sign-in check that runs before any send.
let sends: string[];

beforeEach(() => {
  sends = [];
  localStorage.setItem("elefant_token", "saved.jwt.token");
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/me")) return new Response(JSON.stringify(ME));
    sends.push(url);
    return new Response("{}");
  });
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

async function signedIn() {
  render(<TeamsApp />);
  await screen.findByRole("button", { name: "Settings" });
}

describe("Teams review send notice", () => {
  it("asks before sending pasted text to Elefant", async () => {
    await signedIn();
    fireEvent.change(screen.getByPlaceholderText("Paste the text to review..."), { target: { value: "The Supplier shall deliver the Goods." } });
    fireEvent.click(screen.getByRole("button", { name: "Review Text" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent(/Elefant/);
    expect(sends).toEqual([]);
  });

  it("sends the pasted text once Continue is pressed", async () => {
    await signedIn();
    fireEvent.change(screen.getByPlaceholderText("Paste the text to review..."), { target: { value: "The Supplier shall deliver the Goods." } });
    fireEvent.click(screen.getByRole("button", { name: "Review Text" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));

    await waitFor(() => expect(sends).not.toEqual([]));
  });

  it("shows the Elefant toast once the screen is accepted", async () => {
    localStorage.setItem("elefant_send_ack_elefant", "1");
    await signedIn();
    fireEvent.change(screen.getByPlaceholderText("Paste the text to review..."), { target: { value: "The Supplier shall deliver the Goods." } });
    fireEvent.click(screen.getByRole("button", { name: "Review Text" }));

    expect(await screen.findByText("On its way to Elefant")).toBeInTheDocument();
  });
});

describe("Teams draft send notice", () => {
  it("asks before sending the description to Elefant", async () => {
    await signedIn();
    fireEvent.change(screen.getByLabelText("Draft a clause"), { target: { value: "a mutual NDA term" } });
    fireEvent.click(screen.getByRole("button", { name: "Draft clause" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent(/Elefant/);
    expect(sends).toEqual([]);
  });

  it("shows the Elefant toast once the screen is accepted", async () => {
    localStorage.setItem("elefant_send_ack_elefant", "1");
    await signedIn();
    fireEvent.change(screen.getByLabelText("Draft a clause"), { target: { value: "a mutual NDA term" } });
    fireEvent.click(screen.getByRole("button", { name: "Draft clause" }));

    expect(await screen.findByText("On its way to Elefant")).toBeInTheDocument();
  });
});
