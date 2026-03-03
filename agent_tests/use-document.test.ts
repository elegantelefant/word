// ABOUTME: Tests for useDocument hook — selection reading, body reading, error handling.
// ABOUTME: Mocks lib/office to test hook state transitions without Word API.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDocument } from "@/hooks/useDocument";

vi.mock("@/lib/office", () => ({
  isOfficeReady: vi.fn(() => false),
  getSelectedText: vi.fn(),
  getDocumentBody: vi.fn(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useDocument", () => {
  it("starts with empty state", () => {
    const { result } = renderHook(() => useDocument());
    expect(result.current.text).toBe("");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("readSelection returns error when Office not ready", async () => {
    const { result } = renderHook(() => useDocument());

    let returned: string = "";
    await act(async () => {
      returned = await result.current.readSelection();
    });

    expect(returned).toBe("");
    expect(result.current.error).toBe("Office not available");
  });

  it("readBody returns error when Office not ready", async () => {
    const { result } = renderHook(() => useDocument());

    let returned: string = "";
    await act(async () => {
      returned = await result.current.readBody();
    });

    expect(returned).toBe("");
    expect(result.current.error).toBe("Office not available");
  });

  it("readSelection returns text and updates state", async () => {
    const { isOfficeReady, getSelectedText } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getSelectedText).mockResolvedValue("Selected clause text");

    const { result } = renderHook(() => useDocument());

    let returned: string = "";
    await act(async () => {
      returned = await result.current.readSelection();
    });

    expect(returned).toBe("Selected clause text");
    expect(result.current.text).toBe("Selected clause text");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("readBody returns full document text", async () => {
    const { isOfficeReady, getDocumentBody } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getDocumentBody).mockResolvedValue("Full document body text here");

    const { result } = renderHook(() => useDocument());

    let returned: string = "";
    await act(async () => {
      returned = await result.current.readBody();
    });

    expect(returned).toBe("Full document body text here");
    expect(result.current.text).toBe("Full document body text here");
  });

  it("readSelection sets error on failure", async () => {
    const { isOfficeReady, getSelectedText } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getSelectedText).mockRejectedValue(new Error("No selection"));

    const { result } = renderHook(() => useDocument());

    let returned: string = "";
    await act(async () => {
      returned = await result.current.readSelection();
    });

    expect(returned).toBe("");
    expect(result.current.error).toBe("No selection");
    expect(result.current.loading).toBe(false);
  });

  it("readBody sets error on failure", async () => {
    const { isOfficeReady, getDocumentBody } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getDocumentBody).mockRejectedValue(new Error("Document locked"));

    const { result } = renderHook(() => useDocument());

    let returned: string = "";
    await act(async () => {
      returned = await result.current.readBody();
    });

    expect(returned).toBe("");
    expect(result.current.error).toBe("Document locked");
  });

  it("clears error on successful read after failure", async () => {
    const { isOfficeReady, getSelectedText } = await import("@/lib/office");
    vi.mocked(isOfficeReady).mockReturnValue(true);
    vi.mocked(getSelectedText)
      .mockRejectedValueOnce(new Error("Fail"))
      .mockResolvedValueOnce("Second try works");

    const { result } = renderHook(() => useDocument());

    await act(async () => {
      await result.current.readSelection();
    });
    expect(result.current.error).toBe("Fail");

    await act(async () => {
      await result.current.readSelection();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.text).toBe("Second try works");
  });
});
