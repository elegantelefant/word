# Plan: Fix Code Review Issues (Round 2)

## Context

Five parallel code review agents scored 11 issues. 7 scored >=80 (critical), 5 scored 72-75 (important). This plan fixes all 12, grouped by root cause.

## Verified Facts

- `AuthState` has no `error` field — only `{ token, user, tier, loading }`
- `AuthContextValue` extends `AuthState` with `login()` and `logout()`
- `ClausesPanel` gates on `tier !== "paid"` with UpgradePrompt — same as Mammoth/FullAnalysis
- ADK's `runner.runAsync()` does NOT accept AbortSignal — only `{ userId, sessionId, newMessage, stateDelta?, runConfig? }`
- `useJob` hook is not imported by any production component (only test files)
- FullAnalysisPanel shows "Please select some text (at least 10 characters)" for non-Office — no Office-specific message

---

## Fix 1: Flash of UpgradePrompt for paid users (Score: 95)

**Root cause:** Auth starts `{ tier: "free", loading: false }`. The saved-token check is in a `useEffect` (fires after first render). Paid users see UpgradePrompt/lock icons flash before `loadUser` resolves.

**Files:** `src/store/auth.ts`, `src/hooks/useAuth.ts`, `src/components/panels/FullAnalysisPanel.tsx`, `src/components/panels/MammothPanel.tsx`, `src/components/panels/ClausesPanel.tsx`

### Steps:

**1a.** In `src/hooks/useAuth.ts`, change initial state to eagerly detect saved token:

```ts
const [state, setState] = useState<AuthState>(() => {
  const saved = getSavedToken();
  return saved ? { ...AUTH_INITIAL, loading: true } : AUTH_INITIAL;
});
```

This sets `loading: true` synchronously when a saved token exists, before any render.

**1b.** In each paid panel (`FullAnalysisPanel`, `MammothPanel`, `ClausesPanel`), add a loading guard BEFORE the tier check:

```ts
export function MammothPanel() {
  const { tier, token, loading } = useAuth();

  if (loading) {
    return <p className="py-4 text-center text-xs text-gray-400">Loading...</p>;
  }

  if (tier !== "paid" || !token) {
    return <UpgradePrompt feature="Mammoth" />;
  }
  // ...
}
```

Apply the same pattern to `FullAnalysisPanel` and `ClausesPanel`.

**1c.** In `src/components/Layout.tsx`, treat `loading` as "don't show locks yet":

```ts
const { tier, loading } = useAuth();
// In the tab rendering:
const locked = tab.paidOnly && tier !== "paid" && !loading;
```

This prevents lock icons from flashing on tabs during auth loading.

**Verification:** Load app with a saved token in localStorage. No flash of UpgradePrompt or lock icons. Footer should show a neutral state during loading (or hide the tier badge).

---

## Fix 2: `safeSetItem` silently swallows errors (Score: 85)

**Root cause:** `safeSetItem` catches all errors, returns a boolean no caller checks. CLAUDE.md: "Never swallow, always add meaning."

**Files:** `src/lib/storage.ts`, `src/api/auth.ts`

### Steps:

**2a.** In `src/lib/storage.ts`, add `console.error` inside the catch:

```ts
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.error(`[storage] Failed to write "${key}":`, err);
    return false;
  }
}
```

**2b.** In `src/api/auth.ts`, make `saveToken` throw on failure:

```ts
export function saveToken(token: string): void {
  if (!safeSetItem(TOKEN_KEY, token)) {
    throw new Error("Failed to save authentication token. Storage may be full or disabled.");
  }
}
```

This ensures callers (the login dialog handlers) see the error and can surface it. The `login` catch block (fixed in Fix 3) will handle this.

**Verification:** Mock `localStorage.setItem` to throw in a unit test. Verify `saveToken` throws and the error message is clear.

---

## Fix 3: `login` catch swallows all errors (Score: 85)

**Root cause:** Bare `catch {}` discards the error. User gets no feedback on popup blocked, dialog closed, timeout, or saveToken failure.

**Files:** `src/store/auth.ts`, `src/hooks/useAuth.ts`

### Steps:

**3a.** Add `error` field to `AuthState` in `src/store/auth.ts`:

```ts
export interface AuthState {
  token: string | null;
  user: MeResponse | null;
  tier: Tier;
  loading: boolean;
  error: string | null;  // NEW
}

export const AUTH_INITIAL: AuthState = {
  token: null,
  user: null,
  tier: "free",
  loading: false,
  error: null,  // NEW
};
```

**3b.** In `src/hooks/useAuth.ts`, update the `login` catch block to surface the error:

```ts
} catch (err) {
  const message = err instanceof Error ? err.message : "Login failed";
  setState((prev) => ({ ...prev, loading: false, error: message }));
} finally {
  loginInFlight.current = false;
}
```

**3c.** Also clear `error` at the start of `login` and `loadUser`:

```ts
// At the start of login:
setState((prev) => ({ ...prev, error: null }));

// At the start of loadUser:
setState((prev) => ({ ...prev, loading: true, error: null }));
```

**3d.** The `error` field is now available via `useAuth()` throughout the app. Components can display it if needed. The SettingsPanel or Layout could show a toast/banner for auth errors. For now, it's at least in state and not silently discarded.

**Verification:** In a test, mock `openLoginDialog` to reject. Verify `error` state is set with the rejection message.

---

## Fix 4: `useJob` is dead production code (Score: 85)

**Root cause:** No production component imports `useJob`. All panels manage their own state/cancellation. The hook and its tests are dead code.

**Files:** `src/hooks/useJob.ts`, `agent_tests/hooks.test.ts`, `agent_tests/usejob-abort.test.ts`

### Steps:

**4a.** Delete `src/hooks/useJob.ts`.

**4b.** Delete `agent_tests/hooks.test.ts` and `agent_tests/usejob-abort.test.ts`.

**Note:** Confirm with the user first before deleting. These files might be intended for future use. If keeping, add a comment explaining they're not yet wired up.

**Verification:** `pnpm build` passes. `pnpm test` passes (fewer test files). Grep for "useJob" confirms no remaining imports.

---

## Fix 5: ReviewPanel never passes AbortSignal (Score: 85)

**Root cause:** `signal` was added to `reviewFree`/`reviewPaid` but ReviewPanel has no AbortController. Long-running reviews can't be cancelled. FullAnalysisPanel is the correct reference implementation.

**File:** `src/components/panels/ReviewPanel.tsx`

### Steps:

**5a.** Add an `AbortController` ref and abort-on-unmount, matching FullAnalysisPanel's pattern:

```ts
import { useState, useRef, useEffect } from "react";
// ...
const abortRef = useRef<AbortController | null>(null);

// Abort on unmount
useEffect(() => () => { abortRef.current?.abort(); }, []);
```

**5b.** In `handleReview`, create a new controller and pass its signal:

```ts
async function handleReview() {
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;

  setLoading(true);
  setError(null);
  setResult(null);

  try {
    // ... get text ...

    const response =
      tier === "paid" && token
        ? await reviewPaid(text, token, instructions || undefined, undefined, controller.signal)
        : await reviewFree(text, settings.apiKey, settings.model, instructions || undefined, controller.signal);

    setResult(response);
    // ...
  } catch (err) {
    if (controller.signal.aborted) return;
    setError(err instanceof Error ? err.message : "Review failed");
  } finally {
    setLoading(false);
  }
}
```

**5c.** The "Reviewing..." button could optionally become a Cancel button while loading, but that's a UI decision — out of scope for this fix. The signal at least prevents state updates on unmounted components.

**Verification:** Start a review, switch tabs (unmounting the panel). No React warnings about unmounted state updates.

---

## Fix 6: ABOUTME comments don't match code (Score: 85)

**Files:** `src/components/UpgradePrompt.tsx`, `src/hooks/useJob.ts` (if not deleted in Fix 4)

### Steps:

**6a.** `src/components/UpgradePrompt.tsx` line 2 — change:
```
// ABOUTME: Displays upgrade CTA and optional "Use Tauri companion" link.
```
to:
```
// ABOUTME: Displays upgrade CTA with link to Elefant Pro pricing.
```

**6b.** If `useJob.ts` is kept (not deleted in Fix 4), line 2 — change:
```
// ABOUTME: Returns job state, result, and abort function.
```
to:
```
// ABOUTME: Returns job state, result, poll trigger, and reset function.
```

**Verification:** Read ABOUTME lines and confirm they match the actual exports/behavior.

---

## Fix 7: `onAuthErrorCallback` can throw and prevent ApiError(401) (Score: 80)

**Root cause:** If `logout()` → `localStorage.removeItem()` throws `SecurityError`, the `ApiError(401)` is never thrown. Callers get wrong error type.

**File:** `src/api/client.ts`

### Steps:

**7a.** Wrap the callback invocation in try/catch:

```ts
if (res.status === 401) {
  try { onAuthErrorCallback?.(); } catch { /* logout is best-effort */ }
  throw new ApiError(401, "Session expired. Please sign in again.");
}
```

**Verification:** In a test, set `onAuthErrorCallback` to a function that throws. Verify `apiFetch` still throws `ApiError(401)`.

---

## Fix 8: `visitedTabs` ref works by coincidence (Score: 75)

**Root cause:** Ref mutation doesn't trigger re-render. Works only because `setActiveTab` is called on the same line. A `React.memo` wrapper or separated mutation would silently break lazy mounting.

**File:** `src/App.tsx`

### Steps:

**8a.** Replace `useRef` with `useState`:

```ts
const [visitedTabs, setVisitedTabs] = useState(() => new Set<TabId>(["review", "history"]));
const handleTabChange = useCallback((tab: TabId) => {
  setVisitedTabs((prev) => {
    if (prev.has(tab)) return prev;  // No re-render if already visited
    return new Set(prev).add(tab);
  });
  setActiveTab(tab);
}, []);
```

**8b.** Update `TabContent` prop from `visitedTabs={visitedTabs.current}` to `visitedTabs={visitedTabs}`.

**Verification:** Add `React.memo` to `TabContent` temporarily. Verify tabs still mount correctly on first visit.

---

## Fix 9: Agent signal only checked between events (Score: 75)

**Root cause:** ADK's `runner.runAsync()` does NOT accept AbortSignal (verified from types: params are `userId, sessionId, newMessage, stateDelta?, runConfig?`). The `throwIfAborted()` between iterations is the best available option.

**File:** `src/lib/agent.ts`

### Steps:

**9a.** Add a comment explaining the limitation:

```ts
for await (const event of runner.runAsync({
  userId: "user",
  sessionId: session.id,
  newMessage: { role: "user", parts: [{ text: prompt }] },
})) {
  // ADK's runAsync doesn't accept AbortSignal — check between events as best-effort
  signal?.throwIfAborted();
  // ...
}
```

No code change needed — this is an ADK limitation, not a bug in our code. The comment prevents future developers from trying to "fix" it.

**Verification:** None needed — documentation only.

---

## Fix 10: Double-logout on 401 (Score: 75)

**Root cause:** Both `onAuthErrorCallback` (fires `logout()`) and `loadUser`'s catch block (calls `clearToken` + `setState(AUTH_INITIAL)`) handle the same 401. The interceptor was added as centralized 401 handling, but `loadUser` still has its own 401 path.

**File:** `src/hooks/useAuth.ts`

### Steps:

**10a.** Remove the 401-specific handling from `loadUser`'s catch block. The interceptor handles it:

```ts
} catch (err) {
  // Auth errors (401) are handled centrally by the onAuthError interceptor.
  // Here we only handle non-auth errors (network issues, server errors).
  if (!(err instanceof ApiError && err.isAuthError)) {
    setState((prev) => ({ ...prev, loading: false }));
  }
}
```

The interceptor already calls `logout()` which sets `AUTH_INITIAL` (with `loading: false`), so the loadUser catch doesn't need to handle 401 at all.

**Verification:** Inject a 401 from `getMe()`. Verify `logout()` is called exactly once and state transitions cleanly to free tier.

---

## Fix 11: FullAnalysisPanel wrong error message outside Office (Score: 75)

**Root cause:** Shows "Please select some text (at least 10 characters)" instead of "This feature requires Microsoft Word" when running outside Office. Inconsistent with ReviewPanel.

**File:** `src/components/panels/FullAnalysisPanel.tsx`

### Steps:

**11a.** Add the same `inOffice` check that ReviewPanel uses:

```ts
const inOffice = isOfficeReady();
const text = inOffice
  ? scope === "selection"
    ? await getSelectedText()
    : await getDocumentBody()
  : null;

if (!text || text.trim().length < 10) {
  setError(
    inOffice
      ? "Please select some text (at least 10 characters)."
      : "This feature requires Microsoft Word. Open this add-in from within Word."
  );
  setStatus("error");
  return;
}
```

**Verification:** Run the app outside Office. Verify FullAnalysisPanel shows the Word-required message, matching ReviewPanel.

---

## Fix 12: LockIcon visual changed from solid to outlined (Score: 72)

**Root cause:** During icon extraction, LockIcon changed from `fill="currentColor"` (solid) with `viewBox="0 0 16 16"` to `fill="none" stroke="currentColor"` (outlined) with `viewBox="0 0 20 20"`. Also dropped `className="shrink-0"`. The plan said "Use consistent SVG — the outlined stroke style from UpgradePrompt scales better" — but at size=10 the outlined version is harder to see.

**File:** `src/components/icons.tsx`

### Steps:

**12a.** The outlined style was intentional per the plan. But add `className="shrink-0"` back to prevent flex distortion:

```ts
export function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0" aria-hidden="true">
      <rect x="4" y="9" width="12" height="9" rx="2" />
      <path d="M7 9V6a3 3 0 016 0v3" />
    </svg>
  );
}
```

**12b.** If the outlined lock is too thin at 10px (check visually), increase `strokeWidth` to `"2"` for the tab-bar size. But this is a design judgment — verify with a screenshot comparison.

**Verification:** Screenshot at 350x700. Compare lock icon visibility in tab bar against pre-refactor. The `shrink-0` fix is the important part.

---

## Execution Order

```
Fix 7 (one line — onAuthError guard)
Fix 2 (safeSetItem logging + saveToken throw)
Fix 3 (add error to AuthState, surface in login catch)  ← depends on Fix 2
Fix 1 (flash fix — eager loading state, panel guards)   ← depends on Fix 3
Fix 10 (remove double-logout in loadUser)
Fix 8 (visitedTabs ref → state)
Fix 5 (ReviewPanel AbortSignal)
Fix 11 (FullAnalysisPanel error message)
Fix 6 (ABOUTME comments)
Fix 9 (agent signal comment)
Fix 12 (LockIcon shrink-0)
Fix 4 (delete useJob — ask user first)
```

## Verification After All Fixes

1. `pnpm build` — clean
2. `pnpm test` — all unit tests pass
3. `pnpm test:e2e` — all e2e tests pass
4. Rodney exploratory suite — all 13 pass
5. Manual check: load with saved token, verify no UpgradePrompt flash
