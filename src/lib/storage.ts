// ABOUTME: Safe localStorage wrapper handling QuotaExceededError.
// ABOUTME: Single place to catch storage write failures.

/** Wraps localStorage.setItem in try/catch. Returns true on success. */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
