// ABOUTME: Tests for local history persistence.
// ABOUTME: Verifies add, retrieve, max items, and corrupt data handling.

import { describe, it, expect, beforeEach } from "vitest";
import { addToLocalHistory, type LocalHistoryItem } from "@/lib/history";

const HISTORY_KEY = "elefant_history";

beforeEach(() => {
  localStorage.clear();
});

function getHistory(): LocalHistoryItem[] {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
}

describe("local history", () => {
  it("adds items to history", () => {
    addToLocalHistory({ type: "review", summary: "No issues found." });
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]!.type).toBe("review");
    expect(history[0]!.summary).toBe("No issues found.");
    expect(history[0]!.id).toBeTruthy();
    expect(history[0]!.timestamp).toBeTruthy();
  });

  it("prepends new items (most recent first)", () => {
    addToLocalHistory({ type: "review", summary: "First" });
    addToLocalHistory({ type: "review", summary: "Second" });
    const history = getHistory();
    expect(history[0]!.summary).toBe("Second");
    expect(history[1]!.summary).toBe("First");
  });

  it("caps at 50 items", () => {
    for (let i = 0; i < 55; i++) {
      addToLocalHistory({ type: "review", summary: `Item ${i}` });
    }
    expect(getHistory()).toHaveLength(50);
  });

  it("handles corrupt localStorage", () => {
    localStorage.setItem(HISTORY_KEY, "not-json");
    addToLocalHistory({ type: "review", summary: "After corrupt" });
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]!.summary).toBe("After corrupt");
  });
});
