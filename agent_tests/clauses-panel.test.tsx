// ABOUTME: Tests for ClausesPanel — database listing, clause search, expand/insert.
// ABOUTME: Verifies upgrade prompt for free tier and paid-tier data flow.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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

  it("refetches databases and clauses when the panel becomes active again", async () => {
    const database = {
      id: "db1",
      name: "Standard Clauses",
      clause_count: 1,
    };
    const initialClause = {
      id: "c1",
      name: "Initial Clause",
      content: "Initial text",
    };
    const refreshedClause = {
      id: "c2",
      name: "Refreshed Clause",
      content: "Updated text",
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ databases: [database] })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ clauses: [initialClause] })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ databases: [database] })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ clauses: [refreshedClause] })),
      );

    const auth = {
      ...AUTH_INITIAL,
      tier: "paid" as const,
      token: "tok-123",
      login: noopAsync,
      logout: noop,
    };
    const { rerender } = render(
      <AuthContext value={auth}>
        <ClausesPanel active />
      </AuthContext>,
    );

    await waitFor(() => {
      expect(screen.getByText("Initial Clause")).toBeInTheDocument();
    });
    rerender(
      <AuthContext value={auth}>
        <ClausesPanel active={false} />
      </AuthContext>,
    );
    rerender(
      <AuthContext value={auth}>
        <ClausesPanel active />
      </AuthContext>,
    );

    await waitFor(() => {
      expect(screen.getByText("Refreshed Clause")).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });
    it("refreshes databases and clauses when the user clicks Refresh", async () => {
    const database = {
      id: "db1",
      name: "Standard Clauses",
      clause_count: 1,
    };

    const initialClause = {
      id: "c1",
      name: "Initial Clause",
      content: "Initial text",
    };

    const refreshedClause = {
      id: "c2",
      name: "Refreshed Clause",
      content: "Updated text",
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ databases: [database] })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ clauses: [initialClause] })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ databases: [database] })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ clauses: [refreshedClause] })),
      );

    const auth = {
      ...AUTH_INITIAL,
      tier: "paid" as const,
      token: "tok-123",
      login: noopAsync,
      logout: noop,
    };

    render(
      <AuthContext value={auth}>
        <ClausesPanel active />
      </AuthContext>,
    );

    await waitFor(() => {
      expect(screen.getByText("Initial Clause")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Refresh clauses" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Refreshed Clause")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(4);
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

  it("loads the selected database's clauses when switching databases", async () => {
    const dbs = [
      { id: "db1", name: "Standard", clause_count: 1 },
      { id: "db2", name: "Custom", clause_count: 1 },
    ];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: dbs })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ clauses: [{ id: "c1", name: "Standard Clause", content: "a" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ clauses: [{ id: "c2", name: "Custom Clause", content: "b" }] })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("Standard Clause")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "db2" } });

    await waitFor(() => {
      expect(screen.getByText("Custom Clause")).toBeInTheDocument();
    });
  });

  it("ignores a superseded database's clauses that resolve late", async () => {
    const dbs = [
      { id: "db1", name: "Standard", clause_count: 1 },
      { id: "db2", name: "Custom", clause_count: 1 },
    ];
    let resolveStale!: (response: Response) => void;

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: dbs })))
      .mockReturnValueOnce(new Promise<Response>((resolve) => { resolveStale = resolve; }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ clauses: [{ id: "c2", name: "Custom Clause", content: "b" }] })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "db2" } });
    await waitFor(() => {
      expect(screen.getByText("Custom Clause")).toBeInTheDocument();
    });

    resolveStale(new Response(JSON.stringify({ clauses: [{ id: "c1", name: "Standard Clause", content: "a" }] })));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Refresh clauses" })).toBeEnabled();
    });
    expect(screen.queryByText("Standard Clause")).not.toBeInTheDocument();
  });

  it("keeps Refresh disabled until every in-flight load settles", async () => {
    let resolveClauses!: (response: Response) => void;

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: [{ id: "db1" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ clauses: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: [{ id: "db1" }] })))
      .mockReturnValueOnce(new Promise<Response>((resolve) => { resolveClauses = resolve; }));

    const auth = {
      ...AUTH_INITIAL,
      tier: "paid" as const,
      token: "tok-123",
      login: noopAsync,
      logout: noop,
    };
    const { rerender } = render(
      <AuthContext value={auth}>
        <ClausesPanel active />
      </AuthContext>,
    );

    await waitFor(() => {
      expect(screen.getByText("No clauses in this database.")).toBeInTheDocument();
    });
    rerender(
      <AuthContext value={auth}>
        <ClausesPanel active={false} />
      </AuthContext>,
    );
    rerender(
      <AuthContext value={auth}>
        <ClausesPanel active />
      </AuthContext>,
    );
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(4);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByRole("button", { name: "Refresh clauses" })).toBeDisabled();

    resolveClauses(new Response(JSON.stringify({ clauses: [] })));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Refresh clauses" })).toBeEnabled();
    });
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
      expect(
        screen.getByText("Something went wrong while contacting Elefant. Please try again."),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Server Error|500/)).not.toBeInTheDocument();
    });
  });
});

describe("ClausesPanel — reloads and races", () => {
  const dbs = [
    { id: "db1", name: "Standard", clause_count: 1 },
    { id: "db2", name: "Custom", clause_count: 1 },
  ];
  const dbList = "/clause-databases";
  const clausesFor = (db: string) => ({ clauses: [{ id: db, name: `${db} Clause`, content: db }] });
  const authFor = (token: string) => ({ ...AUTH_INITIAL, tier: "paid" as const, token, login: noopAsync, logout: noop });

  type Pending = { url: string; auth: string | null; resolve: (r: Response) => void };
  let pending: Pending[];

  beforeEach(() => {
    pending = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) =>
      new Promise<Response>((resolve) => {
        pending.push({ url: String(input), auth: new Headers(init?.headers).get("Authorization"), resolve });
      }),
    );
  });

  async function settle(match: string, body: unknown) {
    await waitFor(() => expect(pending.some((p) => p.url.includes(match))).toBe(true));
    const [p] = pending.splice(pending.findIndex((q) => q.url.includes(match)), 1);
    await act(async () => { p!.resolve(new Response(JSON.stringify(body))); });
  }

  async function mount(token = "tok-1") {
    const view = render(<AuthContext value={authFor(token)}><ClausesPanel active /></AuthContext>);
    await settle(dbList, { databases: dbs });
    await settle("/db1/clauses", clausesFor("db1"));
    await screen.findByText("db1 Clause");
    return view;
  }

  it("keeps the selected database's clauses when Refresh resolves after a switch", async () => {
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Refresh clauses" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "db2" } });
    await settle("/db2/clauses", clausesFor("db2"));
    await settle(dbList, { databases: dbs });
    while (pending.some((p) => p.url.includes("/clauses"))) {
      const url = pending.find((p) => p.url.includes("/clauses"))!.url;
      await settle(url, clausesFor(url.includes("db1") ? "db1" : "db2"));
    }

    expect(screen.getByText("db2 Clause")).toBeInTheDocument();
    expect(screen.queryByText("db1 Clause")).not.toBeInTheDocument();
  });

  it("shows a failed database reload after Refresh even when clauses load", async () => {
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Refresh clauses" }));
    await waitFor(() => expect(pending.some((p) => p.url.endsWith(dbList))).toBe(true));
    const [dbLoad] = pending.splice(pending.findIndex((p) => p.url.endsWith(dbList)), 1);
    await act(async () => { dbLoad!.resolve(new Response("Server Error", { status: 500 })); });
    await settle("/db1/clauses", clausesFor("db1"));

    expect(
      screen.getByText("Something went wrong while contacting Elefant. Please try again."),
    ).toBeInTheDocument();
  });

  it("falls back to the first database when the selected one disappears on refresh", async () => {
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Refresh clauses" }));
    await settle(dbList, { databases: [dbs[1], { id: "db3", name: "Other", clause_count: 0 }] });
    while (pending.some((p) => p.url.includes("/db1/clauses"))) {
      await settle("/db1/clauses", clausesFor("db1"));
    }
    await settle("/db2/clauses", clausesFor("db2"));

    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("db2");
    expect(screen.getByText("db2 Clause")).toBeInTheDocument();
    expect(screen.queryByText("db1 Clause")).not.toBeInTheDocument();
  });

  it("keeps a failed database reload visible when the user then switches database", async () => {
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Refresh clauses" }));
    await waitFor(() => expect(pending.some((p) => p.url.endsWith(dbList))).toBe(true));
    const [dbLoad] = pending.splice(pending.findIndex((p) => p.url.endsWith(dbList)), 1);
    await act(async () => { dbLoad!.resolve(new Response("Server Error", { status: 500 })); });
    await settle("/db1/clauses", clausesFor("db1"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "db2" } });
    await settle("/db2/clauses", clausesFor("db2"));

    expect(
      screen.getByText("Something went wrong while contacting Elefant. Please try again."),
    ).toBeInTheDocument();
  });

  it("reloads with the new token when the token changes", async () => {
    const view = await mount("tok-1");
    view.rerender(<AuthContext value={authFor("tok-2")}><ClausesPanel active /></AuthContext>);

    await waitFor(() => {
      expect(pending.map((p) => p.auth)).toContain("Bearer tok-2");
    });
  });

  it("keeps Refresh disabled while a superseded databases load is still in flight", async () => {
    const view = await mount();
    fireEvent.click(screen.getByRole("button", { name: "Refresh clauses" }));
    view.rerender(<AuthContext value={authFor("tok-1")}><ClausesPanel active={false} /></AuthContext>);
    view.rerender(<AuthContext value={authFor("tok-1")}><ClausesPanel active /></AuthContext>);
    await waitFor(() => expect(pending.filter((p) => p.url.endsWith(dbList))).toHaveLength(2));

    await settle(dbList, { databases: dbs });
    while (pending.some((p) => p.url.includes("/clauses"))) {
      await settle("/db1/clauses", clausesFor("db1"));
    }

    expect(pending.some((p) => p.url.endsWith(dbList))).toBe(true);
    expect(screen.getByRole("button", { name: "Refresh clauses" })).toBeDisabled();
  });
});
