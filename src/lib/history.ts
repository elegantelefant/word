// ABOUTME: Local history storage for free-tier review results.
// ABOUTME: Stores review summaries in localStorage with a capped list.

const HISTORY_KEY = "elefant_history";
const MAX_LOCAL_ITEMS = 50;

export interface LocalHistoryItem {
  id: string;
  type: string;
  summary: string;
  timestamp: string;
}

export function addToLocalHistory(item: Omit<LocalHistoryItem, "id" | "timestamp">): void {
  const history = getLocalHistory();
  history.unshift({
    ...item,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });
  if (history.length > MAX_LOCAL_ITEMS) history.length = MAX_LOCAL_ITEMS;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getLocalHistory(): LocalHistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}
