// ABOUTME: Tests for MammothPanel — legal request creation and listing.
// ABOUTME: Verifies upgrade prompt, create form validation, and request display.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MammothPanel } from "@/components/panels/MammothPanel";
import { AuthContext, type AuthContextValue } from "@/store/auth";
import { AUTH_INITIAL } from "@/store/auth";

vi.mock("@/lib/office", () => ({
  isOfficeReady: vi.fn(() => false),
  getSelectedText: vi.fn(),
}));

const noop = () => { };
const noopAsync = async () => { };

function renderWithAuth(overrides: Partial<AuthContextValue> = {}) {
  const auth: AuthContextValue = {
    ...AUTH_INITIAL,
    login: noopAsync,
    logout: noop,
    ...overrides,
  };
  return render(
    <AuthContext value={auth}>
      <MammothPanel />
    </AuthContext>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("MammothPanel — free tier", () => {
  it("shows upgrade prompt", () => {
    renderWithAuth();
    expect(screen.getByText("Mammoth requires Elefant Pro")).toBeInTheDocument();
  });
});

describe("MammothPanel — paid tier", () => {

    it("refreshes requests when the user clicks Refresh", async () => {
    const pendingRequest = {
      id: "r1",
      request_type: "review",
      status: "pending",
      priority: "normal",
      title: "Review NDA",
    };
    const completedRequest = {
      ...pendingRequest,
      status: "completed",
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ requests: [pendingRequest], total: 1 }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ requests: [completedRequest], total: 1 }),
        ),
      );

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("pending")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Refresh requests" }),
    );

    await waitFor(() => {
      expect(screen.getByText("completed")).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
  const paidAuth: Partial<AuthContextValue> = { tier: "paid", token: "tok-123" };

  it("loads request list on mount", async () => {
    const requests = [
      { id: "r1", request_type: "review", status: "completed", priority: "normal", title: "Review NDA" },
      { id: "r2", request_type: "research", status: "pending", priority: "high", title: "IP Research" },
    ];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests, total: 2 })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("Review NDA")).toBeInTheDocument();
    });
    expect(screen.getByText("IP Research")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("refetches requests when the panel becomes active again", async () => {
    const pendingRequest = {
      id: "r1",
      request_type: "review",
      status: "pending",
      priority: "normal",
      title: "Review NDA",
    };
    const completedRequest = {
      ...pendingRequest,
      status: "completed",
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ requests: [pendingRequest], total: 1 }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ requests: [completedRequest], total: 1 }),
        ),
      );

    const auth: AuthContextValue = {
      ...AUTH_INITIAL,
      tier: "paid",
      token: "tok-123",
      login: noopAsync,
      logout: noop,
    };

    const { rerender } = render(
      <AuthContext value={auth}>
        <MammothPanel active />
      </AuthContext>,
    );

    await waitFor(() => {
      expect(screen.getByText("pending")).toBeInTheDocument();
    });

    rerender(
      <AuthContext value={auth}>
        <MammothPanel active={false} />
      </AuthContext>,
    );
    rerender(
      <AuthContext value={auth}>
        <MammothPanel active />
      </AuthContext>,
    );

    await waitFor(() => {
      expect(screen.getByText("completed")).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("shows empty state when no requests", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests: [], total: 0 })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("No legal requests yet.")).toBeInTheDocument();
    });
  });

  it("toggles between list and create views", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests: [], total: 0 })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("No legal requests yet.")).toBeInTheDocument();
    });

    // Switch to create view
    fireEvent.click(screen.getByText("+ New"));
    expect(screen.getByPlaceholderText("Request title...")).toBeInTheDocument();
    expect(screen.getByText("Create Request")).toBeInTheDocument();

    // Switch back to list
    fireEvent.click(screen.getByText("Requests"));
    expect(screen.getByText("No legal requests yet.")).toBeInTheDocument();
  });

  it("create form shows type and priority selectors", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests: [], total: 0 })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("+ New")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("+ New"));

    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);

    // Type selector
    const typeOptions = [...selects[0]!.querySelectorAll("option")].map((o) => o.textContent);
    expect(typeOptions).toEqual(["Review", "Research", "Draft", "Extraction", "Analysis"]);

    // Priority selector
    const priorityOptions = [...selects[1]!.querySelectorAll("option")].map((o) => o.textContent);
    expect(priorityOptions).toEqual(["Low", "Normal", "High", "Urgent"]);
  });

  it("validates title is required on submit", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests: [], total: 0 })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      fireEvent.click(screen.getByText("+ New"));
    });

    // Submit without title
    fireEvent.click(screen.getByText("Create Request"));

    expect(screen.getByText("Title is required.")).toBeInTheDocument();
  });

  it("submits create form and refreshes list", async () => {
    const created = { id: "r1", request_type: "review", status: "draft", priority: "normal", title: "New Request" };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests: [], total: 0 })))  // initial load
      .mockResolvedValueOnce(new Response(JSON.stringify(created)))  // create
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests: [created], total: 1 })));  // refresh

    renderWithAuth(paidAuth);

    await waitFor(() => {
      fireEvent.click(screen.getByText("+ New"));
    });

    fireEvent.change(screen.getByPlaceholderText("Request title..."), { target: { value: "New Request" } });
    fireEvent.click(screen.getByText("Create Request"));

    await waitFor(() => {
      expect(screen.getByText("New Request")).toBeInTheDocument();
    });
  });

  it("shows error when list load fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Server Error", { status: 500 }));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText(/Server Error/)).toBeInTheDocument();
    });
  });

  it("shows request description when present", async () => {
    const requests = [
      { id: "r1", request_type: "review", status: "completed", priority: "normal", title: "NDA Review", description: "Please check indemnity clauses" },
    ];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests, total: 1 })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("Please check indemnity clauses")).toBeInTheDocument();
    });
  });

  it("shows 'Result available' when request has result", async () => {
    const requests = [
      { id: "r1", request_type: "review", status: "completed", priority: "normal", title: "Done", result: { summary: "ok" } },
    ];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests, total: 1 })));

    renderWithAuth(paidAuth);

    await waitFor(() => {
      expect(screen.getByText("Result available")).toBeInTheDocument();
    });
  });
});
