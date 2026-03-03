// ABOUTME: Tests for ClausesPanel — database listing, clause search, expand/insert.
// ABOUTME: Verifies upgrade prompt for free tier and paid-tier data flow.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClausesPanel } from "@/components/panels/ClausesPanel";
import { AuthContext, type AuthContextValue } from "@/store/auth";
import { AUTH_INITIAL } from "@/store/auth";

vi.mock("@/lib/office", () => ({
  isOfficeReady: vi.fn(() => false),
  insertText: vi.fn(),
}));

const noop = () => {};
const noopAsync = async () => {};

function renderWithAuth(overrides: Partial<AuthContextValue> = {}) {
  const auth: AuthContextValue = {
    ...AUTH_INITIAL,
    login: noopAsync,
    logout: noop,
    ...overrides,
  };
  return render(
    <AuthContext value={auth}>
      <ClausesPanel />
    </AuthContext>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ClausesPanel — free tier", () => {
  it("shows upgrade prompt", () => {
    renderWithAuth();
    expect(screen.getByText("Clause Search requires Elefant Pro")).toBeInTheDocument();
  });
});

describe("ClausesPanel — paid tier", () => {
  const paidAuth: Partial<AuthContextValue> = { tier: "paid", token: "tok-123" };

  it("loads databases on mount", async () => {
    const dbs = [{ id: "db1", name: "Standard Clauses", clause_count: 42 }];
    const clauses = [
      { id: "c1", name: "Indemnity", content: "The party shall indemnify...", category: "Liability" },
      { id: "c2", name: "Force Majeure", content: "Neither party shall be liable...", category: null },
    ];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: dbs })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ clauses })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("Indemnity")).toBeInTheDocument();
    });
    expect(screen.getByText("Force Majeure")).toBeInTheDocument();
  });

  it("shows database selector when multiple databases", async () => {
    const dbs = [
      { id: "db1", name: "Standard", clause_count: 10 },
      { id: "db2", name: "Custom", clause_count: 5 },
    ];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: dbs })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ clauses: [] })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const options = [...screen.getByRole("combobox").querySelectorAll("option")];
    expect(options).toHaveLength(2);
    expect(options[0]!.textContent).toContain("Standard");
    expect(options[1]!.textContent).toContain("Custom");
  });

  it("filters clauses by search text", async () => {
    const clauses = [
      { id: "c1", name: "Indemnity", content: "indemnify and hold harmless" },
      { id: "c2", name: "Termination", content: "either party may terminate" },
    ];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: [{ id: "db1" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ clauses })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("Indemnity")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Search clauses..."), { target: { value: "terminate" } });

    expect(screen.queryByText("Indemnity")).not.toBeInTheDocument();
    expect(screen.getByText("Termination")).toBeInTheDocument();
  });

  it("expands and collapses clause content", async () => {
    const clauses = [{ id: "c1", name: "Indemnity", content: "Full indemnity clause text here." }];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: [{ id: "db1" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ clauses })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("Indemnity")).toBeInTheDocument();
    });

    // Content not visible initially
    expect(screen.queryByText("Full indemnity clause text here.")).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByText("Indemnity"));
    expect(screen.getByText("Full indemnity clause text here.")).toBeInTheDocument();
    expect(screen.getByText("Insert into document")).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByText("Indemnity"));
    expect(screen.queryByText("Full indemnity clause text here.")).not.toBeInTheDocument();
  });

  it("shows category badge", async () => {
    const clauses = [{ id: "c1", name: "Indemnity", content: "text", category: "Liability" }];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: [{ id: "db1" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ clauses })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("Liability")).toBeInTheDocument();
    });
  });

  it("shows empty state when no clauses", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: [{ id: "db1" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ clauses: [] })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("No clauses in this database.")).toBeInTheDocument();
    });
  });

  it("shows empty state for search with no matches", async () => {
    const clauses = [{ id: "c1", name: "Indemnity", content: "text" }];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: [{ id: "db1" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ clauses })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("Indemnity")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Search clauses..."), { target: { value: "zzzzz" } });
    expect(screen.getByText("No matching clauses.")).toBeInTheDocument();
  });

  it("shows error when database load fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Server Error", { status: 500 }));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText(/Server Error|500/)).toBeInTheDocument();
    });
  });
});
