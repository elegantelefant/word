// ABOUTME: Local history storage for free-tier review results.
// ABOUTME: Stores review summaries in localStorage with a capped list.

import { safeSetItem } from "./storage";

const HISTORY_KEY = "elefant_history";
const MAX_LOCAL_ITEMS = 50;

export interface LocalHistoryItem {
  id: string;
  type: string;
  summary: string;
  timestamp: string;
}

function isValidHistoryItem(item: unknown): item is LocalHistoryItem {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.id === "string" && typeof obj.type === "string"
    && typeof obj.summary === "string" && typeof obj.timestamp === "string";
}

export function addToLocalHistory(item: Omit<LocalHistoryItem, "id" | "timestamp">): void {
  const history = getLocalHistory();
  history.unshift({
    ...item,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });
  if (history.length > MAX_LOCAL_ITEMS) history.length = MAX_LOCAL_ITEMS;
  safeSetItem(HISTORY_KEY, JSON.stringify(history));
}

export function getLocalHistory(): LocalHistoryItem[] {
  try {
    const raw: unknown[] = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return raw.filter(isValidHistoryItem);
  } catch {
    return [];
  }
}
