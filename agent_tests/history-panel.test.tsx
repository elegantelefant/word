// ABOUTME: Tests for HistoryPanel component rendering.
// ABOUTME: Verifies local history (free tier) and API history (paid tier) display.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HistoryPanel } from "@/components/panels/HistoryPanel";
import { AuthContext, type AuthContextValue } from "@/store/auth";

const noop = () => { };
const noopAsync = async () => { };

function makeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    token: null,
    user: null,
    tier: "free",
    loading: false,
    login: noopAsync,
    logout: noop,
    ...overrides,
  };
}

function renderWithAuth(auth: AuthContextValue) {
  return render(
    <AuthContext value={auth}>
      <HistoryPanel />
    </AuthContext>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("HistoryPanel — free tier (local history)", () => {
  it("shows empty state when no local history", () => {
    renderWithAuth(makeAuth());
    expect(screen.getByText(/no review history yet/i)).toBeInTheDocument();
  });

  it("shows local history items", () => {
    const items = [
      { id: "1", type: "review", summary: "First review", timestamp: "2025-06-01T10:00:00Z" },
      { id: "2", type: "review", summary: "Second review", timestamp: "2025-06-02T10:00:00Z" },
    ];
    localStorage.setItem("elefant_history", JSON.stringify(items));

    renderWithAuth(makeAuth());

    expect(screen.getByText("Local History")).toBeInTheDocument();
    expect(screen.getByText("First review")).toBeInTheDocument();
    expect(screen.getByText("Second review")).toBeInTheDocument();
  });
});

describe("HistoryPanel — paid tier (API history)", () => {
  it("shows loading then API jobs", async () => {
    const jobs = [
      { id: "j1", type: "review", status: "completed", created_at: "2025-06-01T10:00:00Z" },
      { id: "j2", type: "research", status: "running", created_at: "2025-06-02T10:00:00Z" },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ jobs })),
    );

    renderWithAuth(makeAuth({ tier: "paid", token: "tok-123" }));

    expect(screen.getByText("Loading history...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Activity Feed")).toBeInTheDocument();
    });
    expect(screen.getByText("review")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
  });
  it("keeps existing jobs visible while refreshing", async () => {
    const runningJob = {
      id: "j1",
      type: "review",
      status: "running",
      created_at: "2025-06-01T10:00:00Z",
    };

    const completedJob = {
      ...runningJob,
      status: "completed",
    };

    let resolveRefresh!: (response: Response) => void;
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobs: [runningJob] })),
      )
      .mockImplementationOnce(() => refreshResponse);

    renderWithAuth(makeAuth({ tier: "paid", token: "tok-123" }));

    await waitFor(() => {
      expect(screen.getByText("running")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Refresh history" }),
    );

    expect(screen.getByText("running")).toBeInTheDocument();
    expect(screen.getByText("Refreshing...")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    resolveRefresh(
      new Response(JSON.stringify({ jobs: [completedJob] })),
    );

    await waitFor(() => {
      expect(screen.getByText("completed")).toBeInTheDocument();
    });
  });

  it("keeps existing jobs visible when refresh fails", async () => {
    const runningJob = {
      id: "j1",
      type: "review",
      status: "running",
      created_at: "2025-06-01T10:00:00Z",
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobs: [runningJob] })),
      )
      .mockResolvedValueOnce(
        new Response("Server Error", { status: 500 }),
      );

    renderWithAuth(makeAuth({ tier: "paid", token: "tok-123" }));

    await waitFor(() => {
      expect(screen.getByText("running")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Refresh history" }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Server Error/)).toBeInTheDocument();
    });

    expect(screen.getByText("running")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("shows empty state when API returns no jobs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ jobs: [] })),
    );

    renderWithAuth(makeAuth({ tier: "paid", token: "tok-123" }));

    await waitFor(() => {
      expect(screen.getByText(/no jobs found/i)).toBeInTheDocument();
    });
  });

  it("shows error when API call fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Server Error", { status: 500 }),
    );

    renderWithAuth(makeAuth({ tier: "paid", token: "tok-123" }));

    await waitFor(() => {
      expect(screen.getByText(/Server Error/)).toBeInTheDocument();
    });
  });

  it("retries from the error state when the user clicks Refresh", async () => {
    const job = { id: "j1", type: "review", status: "completed", created_at: "2025-06-01T10:00:00Z" };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Server Error", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobs: [job] })));

    renderWithAuth(makeAuth({ tier: "paid", token: "tok-123" }));

    await waitFor(() => {
      expect(screen.getByText(/Server Error/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Refresh history" }));

    await waitFor(() => {
      expect(screen.getByText("review")).toBeInTheDocument();
    });
  });

  it("offers Refresh from the empty state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ jobs: [] })),
    );

    renderWithAuth(makeAuth({ tier: "paid", token: "tok-123" }));

    await waitFor(() => {
      expect(screen.getByText(/no jobs found/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Refresh history" })).toBeEnabled();
  });

  it("refetches jobs when the panel becomes active again", async () => {
    const runningJob = {
      id: "j1",
      type: "review",
      status: "running",
      created_at: "2025-06-01T10:00:00Z",
    };
    const completedJob = {
      ...runningJob,
      status: "completed",
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobs: [runningJob] })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobs: [completedJob] })),
      );

    const auth = makeAuth({ tier: "paid", token: "tok-123" });

    const { rerender } = render(
      <AuthContext value={auth}>
        <HistoryPanel active />
      </AuthContext>,
    );

    await waitFor(() => {
      expect(screen.getByText("running")).toBeInTheDocument();
    });

    rerender(
      <AuthContext value={auth}>
        <HistoryPanel active={false} />
      </AuthContext>,
    );
    rerender(
      <AuthContext value={auth}>
        <HistoryPanel active />
      </AuthContext>,
    );

    await waitFor(() => {
      expect(screen.getByText("completed")).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("refreshes jobs when the user clicks Refresh", async () => {
    const runningJob = {
      id: "j1",
      type: "review",
      status: "running",
      created_at: "2025-06-01T10:00:00Z",
    };
    const completedJob = {
      ...runningJob,
      status: "completed",
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobs: [runningJob] })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobs: [completedJob] })),
      );

    renderWithAuth(makeAuth({ tier: "paid", token: "tok-123" }));

    await waitFor(() => {
      expect(screen.getByText("running")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Refresh history" }),
    );

    await waitFor(() => {
      expect(screen.getByText("completed")).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});