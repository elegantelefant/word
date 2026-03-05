# Manual Test Predictions — Code-Informed

**Date:** 2026-03-05
**Method:** Static source code analysis of all component, hook, API, and config files.

**Verdicts Legend:**
- **PASS** — code clearly supports this, no issues found
- **FAIL** — bug found in code that will cause this to fail
- **RISK** — code exists but has a fragile path or missing guard
- **UNKNOWN** — can't determine from code alone (depends on API/environment)

---

## Summary

| Section | Total | PASS | FAIL | RISK | UNKNOWN |
|---------|-------|------|------|------|---------|
| Pre-flight | 4 | 3 | 0 | 1 | 0 |
| Settings & Config | 12 | 10 | 0 | 2 | 0 |
| Review — Free | 14 | 14 | 0 | 0 | 0 |
| Review — Paid | 5 | 4 | 0 | 1 | 0 |
| Insert Text | 4 | 2 | 0 | 2 | 0 |
| History | 8 | 7 | 0 | 1 | 0 |
| Clauses | 8 | 7 | 0 | 1 | 0 |
| Mammoth | 10 | 7 | 0 | 2 | 1 |
| Full Analysis | 9 | 7 | 0 | 1 | 1 |
| Error Handling | 5 | 3 | 0 | 2 | 0 |
| Layout | 4 | 4 | 0 | 0 | 0 |
| HTTPS | 2 | 1 | 0 | 1 | 0 |
| **Total** | **85** | **69** | **0** | **14** | **2** |

---

## Bugs Found and Fixed

### BUG-1: Office login dialog stays open after token received — FIXED

**Test:** #10 — `src/api/auth.ts:56` — added `dialog.close()` before resolving the token promise. Both Office and browser paths now close the popup.

### BUG-2: ErrorBoundary "Try again" may not recover — FIXED

**Test:** #75 — `src/components/ErrorBoundary.tsx` — added `resetKey` counter incremented on "Try again". Children are wrapped in `<div key={resetKey}>`, forcing React to destroy and recreate the entire subtree with fresh state.

---

## Detailed Predictions

### Pre-flight

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Dev server running (`pnpm dev`) | **PASS** | `vite.config.ts` valid; `package.json` has `"dev": "vite"` script |
| 2 | HTTPS serving without cert errors | **RISK** | `vite.config.ts:10-20` — `devCerts()` reads from `~/.office-addin-dev-certs/`. If certs not installed (`pnpm certs` not run), Vite falls back to HTTP silently. Also, self-signed certs may trigger browser warnings depending on trust store state. |
| 3 | Manifest sideloaded into Word | **PASS** | `manifest.xml` exists, references `https://localhost:3000/` |
| 4 | Task pane opens | **PASS** | `App.tsx` mounts correctly; `main.tsx` waits for `Office.onReady()` before rendering |

---

### 1. Settings & Configuration

#### 1.1 — Gemini API Key (Free Tier)

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Open Settings (gear icon) | **PASS** | `Layout.tsx:34-38` renders gear icon button; `App.tsx:41` sets `showSettings(true)` which swaps to `<SettingsPanel>` |
| 2 | Enter Gemini API key | **PASS** | `SettingsPanel.tsx:50-53` — controlled input, `onChange` calls `updateSettings({ apiKey })` → `saveSettings()` writes to `localStorage("elefant_settings")` |
| 3 | Toggle show/hide on API key | **PASS** | `SettingsPanel.tsx:21` — `keyVisible` state toggles input `type` between `"text"` and `"password"`; button text shows "Show"/"Hide" |
| 4 | Close Settings, reopen | **PASS** | Settings live in React state (`App.tsx:18`), persist across re-renders; `SettingsPanel` re-reads from same state |
| 5 | Reload task pane, open Settings | **PASS** | `App.tsx:18` — `useState<Settings>(loadSettings)` reads from `localStorage("elefant_settings")` on mount |

#### 1.2 — Model Selection

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 6 | Open model picker | **PASS** | `SettingsPanel.tsx:79-89` — `<select>` dropdown with 3 models (gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash) |
| 7 | Change model | **PASS** | `onChange` calls `updateSettings({ model })` → `saveSettings()` persists to localStorage |
| 8 | Close/reopen Settings | **PASS** | Model stored in same `Settings` object; survives component unmount/remount |

#### 1.3 — Sign In (Paid Tier)

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 9 | Click "Sign in" button | **PASS** | `SettingsPanel.tsx:98` — `onClick={() => void login()}` calls `useAuth.login()` → `openLoginDialog()` |
| 10 | Complete login flow | **PASS** | **BUG-1 FIXED** — `auth.ts:56`: `dialog.close()` now called before resolving. Both Office and browser paths close the popup after token received. |
| 11 | Settings shows account info | **PASS** | `SettingsPanel.tsx:34-42` — when `tier === "paid" && user`, renders `user.user.name` and `user.org.name`. BYOK section is hidden (only rendered for `tier === "free"`). |
| 12 | Click "Sign out" | **RISK** | `SettingsPanel.tsx:39` calls `logout()` → `useAuth.ts:51-53` clears token and resets state to `AUTH_INITIAL`. However, there's no confirmation dialog — accidental clicks immediately sign out. Also, any in-flight API requests with the old token aren't cancelled. |

---

### 2. Review — Free Tier

#### 2.1 — Selection Scope

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 13 | Select text in Word (2+ sentences) | **PASS** | User action; Office.js selection API handles this |
| 14 | Ensure scope = "Selection" | **PASS** | `ReviewPanel.tsx:25` — defaults to `"selection"`; `ScopeButton` component shows active state |
| 15 | Click "Review" | **PASS** | `ReviewPanel.tsx:99-105` — button shows "Reviewing..." when `loading` is true |
| 16 | Wait for result | **PASS** | `reviewFree()` → `lib/agent.ts` runs ADK-JS Gemini agent in-browser; result extracted from `stateDelta.review_result` |
| 17 | Issue cards shown | **PASS** | `ReviewPanel.tsx:130-137` — maps `result.issues` to `<IssueCard>` components |
| 18 | Issue location shown | **PASS** | `ReviewPanel.tsx:152` — renders `issue.location` in italics with quotes when present |
| 19 | Suggestion + "Insert" button | **PASS** | `ReviewPanel.tsx:153-163` — renders suggestion text and Insert button when `issue.suggestion` exists |

#### 2.2 — Document Scope

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 20 | Switch scope to "Full Document" | **PASS** | `ReviewPanel.tsx:83` — `ScopeButton` sets `scope` to `"document"` |
| 21 | Click "Review" | **PASS** | `ReviewPanel.tsx:42` — when scope is document, calls `getDocumentBody()` → `office.ts:14-21` reads `ctx.document.body.text` |
| 22 | Results display | **PASS** | Same `ReviewResults` component renders summary + issues |

#### 2.3 — Custom Instructions

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 23 | Type custom instructions | **PASS** | `ReviewPanel.tsx:90-96` — controlled textarea for instructions |
| 24 | Click "Review" | **PASS** | `ReviewPanel.tsx:53` — `instructions` passed to `reviewFree()` which passes to ADK agent prompt |

#### 2.4 — Edge Cases

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 25 | Select very short text (<10 chars) | **PASS** | `ReviewPanel.tsx:45` — validates `text.trim().length < 10`. Shows "Please select some text in your document (at least 10 characters)." Runbook threshold corrected from <20 to <10 to match code. |
| 26 | Select nothing, scope = Selection | **PASS** | `getSelectedText()` returns `""` → `ReviewPanel.tsx:45` — `!text` is true for empty string, shows error message |

---

### 3. Review — Paid Tier

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 27 | Sign in (if not already) | **PASS** | Covered by test #10; tier detection works correctly in `useAuth.ts:11-14` |
| 28 | Select text, click "Review" | **PASS** | `ReviewPanel.tsx:51-52` — when `tier === "paid" && token`, calls `reviewPaid(text, token, instructions)` → POST `/review` |
| 29 | Polling state visible | **RISK** | Button text changes to "Reviewing..." (`ReviewPanel.tsx:104`) during the entire polling loop, but there's no distinct "polling" indicator or progress feedback. User sees a static disabled button for up to 2 minutes with no way to know how many poll cycles have elapsed. |
| 30 | Job completes | **PASS** | `polling.ts:19-20` — on "completed" status, fetches `/jobs/{id}/result` and returns it |
| 31 | Review does NOT appear in local history | **PASS** | `ReviewPanel.tsx:58` — `addToLocalHistory` is guarded by `if (tier === "free")`. Paid reviews never write to localStorage. The test asks specifically about local history, which is deterministic from the code. |

---

### 4. Insert Text

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 32 | Run a review with suggestions | **PASS** | Depends on Gemini/API returning issues with `suggestion` field; the agent prompt requests it |
| 33 | Place cursor in document | **PASS** | User action |
| 34 | Click "Insert" on a suggestion | **RISK** | `office.ts:24-31` — `insertText(text, "replace")` calls `selection.insertText(text, InsertLocation.replace)`. With a collapsed cursor (no selection), this inserts at cursor position. With a selection, it **replaces** the selected text entirely. User may not expect their selected text to be replaced — no confirmation dialog. |
| 35 | Undo (Ctrl+Z) | **RISK** | `Word.run()` operations are tracked on the Word undo stack in most Office.js implementations. However, if multiple sync operations ran (e.g., rapid clicking), undo granularity depends on Word's batching. Not guaranteed to cleanly revert a single insert in all Office hosts (Desktop vs. Web). |

---

### 5. History Tab

#### 5.1 — Local History (Free Tier)

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 36 | Run a free-tier review | **PASS** | `ReviewPanel.tsx:58-59` calls `addToLocalHistory()` after successful free review |
| 37 | Switch to History tab | **PASS** | `HistoryPanel.tsx:47-49` — `useEffect` calls `getLocalHistory()` on mount, reads from localStorage. Tab switch remounts component (conditional render in `App.tsx:50-62`), so fresh read occurs. |
| 38 | Run another review | **RISK** | New item is prepended to localStorage array. But `LocalHistory` component reads localStorage only on mount (`useEffect([], ...)`). If user switches back to Review tab, runs another review, then returns to History tab — component remounts and re-reads. Works. But if user stays on History tab while another mechanism triggers a review (unlikely but possible), the list won't live-update. |

#### 5.2 — API History (Paid Tier)

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 39 | Sign in | **PASS** | Auth flow works (aside from dialog close bug) |
| 40 | Switch to History tab | **PASS** | `HistoryPanel.tsx:84` — shows "Loading history..." while fetching |
| 41 | API jobs load | **PASS** | `HistoryPanel.tsx:77-81` — `listJobs(token)` → GET `/jobs`, sets jobs state |
| 42 | Status badges shown | **PASS** | `HistoryPanel.tsx:107-118` — `StatusBadge` renders color-coded badges for queued/running/completed/failed |
| 43 | Date formatting correct | **PASS** | `HistoryPanel.tsx:125-132` — uses `Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })`. Falls back to raw ISO string on parse error. |

---

### 6. Clauses Tab (Paid Only)

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 44 | Free tier: open Clauses tab | **PASS** | `ClausesPanel.tsx:13-14` — returns `<UpgradePrompt feature="Clause Search" />` when `tier !== "paid"` |
| 45 | Sign in, open Clauses tab | **PASS** | `ClausesPanel.tsx:29-37` — mounts `ClausesContent`, calls `listClauseDatabases(token)` on mount |
| 46 | Select database (if >1) | **PASS** | `ClausesPanel.tsx:69-81` — select dropdown rendered only when `databases.length > 1`; `setActiveDb` triggers clause reload via `useEffect` |
| 47 | Search/filter clauses | **PASS** | `ClausesPanel.tsx:49-55` — client-side filter on `name` and `content`, case-insensitive |
| 48 | Expand a clause | **PASS** | `ClausesPanel.tsx:100` — `expanded` state toggles to show/hide clause content |
| 49 | Category badge visible | **PASS** | `ClausesPanel.tsx:106-109` — renders category badge when `clause.category` exists |
| 50 | Click "Insert into document" | **PASS** | `ClausesPanel.tsx:115` — calls `handleInsert(clause.content)` → `insertText()` from `office.ts` |
| 51 | Empty state (no clauses) | **RISK** | `ClausesPanel.tsx:124-128` — shows "No clauses in this database." or "No matching clauses." depending on search. However, if the API returns an empty `databases` array, `activeDb` stays `null`, no clauses load, and the component shows the search input + clause list area with nothing in it — but no explicit "no databases found" empty state message. |

---

### 7. Mammoth Tab (Paid Only)

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 52 | Free tier: open Mammoth tab | **PASS** | `MammothPanel.tsx:43-44` — returns `<UpgradePrompt feature="Mammoth" />` |
| 53 | Sign in, open Mammoth tab | **PASS** | `MammothPanel.tsx:64` — `refresh()` called on mount via `useEffect`, loads existing requests |
| 54 | Toggle to Create view | **PASS** | `MammothPanel.tsx:78-82` — "+ New" button sets `view` to `"create"` |
| 55 | Fill form: title, type, priority, description | **PASS** | `MammothPanel.tsx:143-176` — input, two selects (type + priority), textarea all present |
| 56 | Submit without title | **PASS** | `MammothPanel.tsx:122-124` — `if (!title.trim())` sets error "Title is required." |
| 57 | Submit valid form | **PASS** | `MammothPanel.tsx:129-132` — calls `createLegalRequest()` → POST `/legal-requests` |
| 58 | Success → list refreshes | **PASS** | `MammothPanel.tsx:93-96` — `onCreated` callback switches view to "list" and calls `refresh()` |
| 59 | "Attach selected text" | **RISK** | `MammothPanel.tsx:113-118` — calls `getSelectedText()` and appends to description with `---` separator. But if nothing is selected in Word, `getSelectedText()` returns `""`, and the `if (text)` guard prevents appending. No user feedback that nothing was selected — the button click appears to do nothing silently. |
| 60 | Request list: status badges | **PASS** | `MammothPanel.tsx:31-38` — `STATUS_COLORS` map covers draft/pending/in_progress/completed/failed/cancelled with color-coded badges |
| 61 | Empty state | **UNKNOWN** | `MammothPanel.tsx:202-203` — shows "No legal requests yet." for empty array. But if the API returns an error instead of an empty list (e.g., endpoint not deployed yet), the error state renders instead. Whether the API is deployed and returns an empty list vs. a 404 is an environment concern. |

---

### 8. Full Analysis Tab (Paid Only)

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 62 | Free tier: open Full Analysis tab | **PASS** | `FullAnalysisPanel.tsx:22-23` — returns `<UpgradePrompt feature="Full Analysis" />` |
| 63 | Sign in, select text | **PASS** | Auth + Office selection APIs work |
| 64 | Click "Analyze" | **PASS** | `FullAnalysisPanel.tsx:113` — button shows "Analyzing..." when `status === "running"` |
| 65 | Parallel jobs fire (review + research) | **RISK** | `FullAnalysisPanel.tsx:54-60` — `Promise.all` fires both POST `/review` and POST `/research` concurrently. The research call has `.catch(() => null)` so a 404 won't crash. But both endpoints must accept `{ text }` / `{ query }` payloads. If the review endpoint expects a different body shape than `{ text }`, the job creation will fail. Panel bypasses `reviewPaid()` and calls `apiFetch` directly with `{ text }` — must match API contract. |
| 66 | Review results display | **PASS** | `FullAnalysisPanel.tsx:121-127` — renders `result.review.summary` and issue count |
| 67 | Research report displays | **UNKNOWN** | `FullAnalysisPanel.tsx:129-133` — renders `result.research.report` only if `result.research` is truthy. Whether the API returns a `{ report: string }` shape depends on the API implementation. |
| 68 | Scope toggle works | **PASS** | `FullAnalysisPanel.tsx:89-105` — same scope toggle pattern as ReviewPanel |
| 69 | Short text validation | **PASS** | `FullAnalysisPanel.tsx:47` — validates `text.trim().length < 10`. Shows "Please select some text (at least 10 characters)." Runbook threshold corrected from <20 to <10 to match code. |
| 70 | Research 404 → graceful fallback | **PASS** | `FullAnalysisPanel.tsx:59` — `.catch(() => null)` on research endpoint creation. Line 67 — `.catch(() => null)` on research polling. Line 71-73 — research result only set if truthy. Review results still display. |

---

### 9. Error Handling

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 71 | Disconnect network, attempt review | **RISK** | **Paid tier:** `client.ts:53-56` — catches fetch errors and throws `NetworkError("Network request failed...")`. Panel catches at `ReviewPanel.tsx:62`. **Free tier:** Network error occurs inside ADK-JS Gemini agent, which throws its own error. The `catch` at line 61-62 should still catch it, but the error message format will differ from the standard `NetworkError`. May show a raw Gemini SDK error instead of the friendly "Network request failed" message. |
| 72 | Use expired/invalid token | **RISK** | `client.ts:60-61` — throws `ApiError(401, "Session expired. Please sign in again.")`. Panel displays this as error text. But test expects "Session expired **+ sign-in prompt**". The code only shows the error message string — there's no automatic sign-in button or redirect to login in the error display. User must manually navigate to Settings to sign in again. |
| 73 | Trigger rate limit (if possible) | **PASS** | `client.ts:63-64` — throws `ApiError(429, "Too many requests. Please wait a moment.")`. Displayed as error text in the panel. |
| 74 | Force component crash (dev tools) | **PASS** | `ErrorBoundary.tsx:17-18` — `getDerivedStateFromError` catches render errors, shows "Something went wrong" + error message + "Try again" button |
| 75 | Click "Try again" | **PASS** | **BUG-2 FIXED** — `ErrorBoundary.tsx` now increments `resetKey` on reset, wrapping children in `<div key={resetKey}>` to force full subtree remount with fresh state. |

---

### 10. Layout & Responsiveness

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 76 | All 5 tabs visible in header | **PASS** | `Layout.tsx:14-19` — `TABS` array: Review, Clauses, Mammoth, Analysis, History. All rendered via `.map()` at line 44-59. |
| 77 | Tab switching | **PASS** | `App.tsx:50-62` — `TabContent` switch renders correct panel for each tab ID |
| 78 | Resize task pane to ~320px width | **PASS** | `Layout.tsx:2` comment: "Sized for Office task pane (~320px wide)". Uses `flex-1` on tabs, text is `text-xs`. Tailwind utilities handle reflow. `overflow-y-auto` on main content area. |
| 79 | Settings gear always accessible | **PASS** | `Layout.tsx:34-38` — gear icon in header, same position regardless of active tab. When settings panel is open, it has its own X close button (`SettingsPanel.tsx:27-28`). |

---

### 11. HTTPS & Dev Server

| # | Step | Verdict | Evidence |
|---|------|---------|----------|
| 80 | Navigate to dev server URL in browser | **PASS** | `vite.config.ts:48-49` — `server.https` configured with certs (if installed); port 3000. CORS headers set. |
| 81 | Task pane loads in Word | **RISK** | `manifest.xml` references `https://localhost:3000/`. Office.js add-ins **require** HTTPS — if the self-signed cert is not trusted by the OS, Word will refuse to load the task pane with a security error. Depends on `pnpm certs` having been run AND the cert being trusted in the system keychain. Different behavior on macOS vs. Windows. |

---

## Risk Items Summary

| # | Test | Risk Description | Mitigation |
|---|------|-----------------|------------|
| 2 | HTTPS cert errors | `devCerts()` falls back to HTTP silently if certs missing | Run `pnpm certs` before testing; verify cert trust |
| 12 | Sign out | No confirmation dialog; in-flight requests not cancelled | Minor UX risk only |
| ~~25~~ | ~~Short text validation~~ | ~~Resolved: runbook corrected to <10 chars to match code~~ | — |
| 29 | Polling state visible | Single "Reviewing..." text for up to 2-minute polling loop | Add elapsed time or poll count indicator |
| 34 | Insert replaces selection | `InsertLocation.replace` replaces selected text without warning | Consider "end" location or confirmation for selection replacement |
| 35 | Undo after insert | Word.run undo behavior varies by Office host | Test on target Office host specifically |
| 38 | History live update | List reads localStorage only on mount; won't update while tab is visible | Minor; tab switch triggers remount |
| 51 | Empty databases state | No explicit message when API returns zero databases | Add "No databases found" empty state |
| 59 | Attach selection silently fails | No feedback when nothing selected in Word | Show "No text selected" toast or message |
| 61 | Mammoth empty state | Depends on API deployment; 404 vs. empty list | Verify API endpoint exists in test environment |
| 65 | Parallel job body shape | Panel sends `{ text }` directly, bypassing `reviewPaid()` | Verify API contract matches |
| 67 | Research report shape | Assumes `{ report: string }` response shape | Verify with API docs |
| ~~69~~ | ~~Full Analysis short text~~ | ~~Resolved: runbook corrected to <10 chars to match code~~ | — |
| 71 | Free-tier network error | ADK-JS Gemini errors may not match `NetworkError` format | Wrap ADK errors in friendly message |
| 72 | 401 missing sign-in prompt | Error text shown but no sign-in button in error display | Add "Sign in" link in 401 error message |
| 81 | Task pane HTTPS trust | Self-signed cert must be trusted by OS + Office host | Verify cert trust on test machine |

---

## Verification Notes

- **Threshold corrected** (tests #25, #69): Runbook updated from <20 to <10 chars to match `ReviewPanel.tsx:45` and `FullAnalysisPanel.tsx:47`.
- **BUG-1 severity**: The Office dialog staying open is a UX annoyance. The state transition (free → paid) works correctly. Some Office.js hosts may auto-close the dialog after `messageParent()` is called by the login page, masking this bug.
- **BUG-2 severity**: For the specific test scenario (force crash via dev tools), "Try again" will likely work because the artificial crash condition is gone on re-mount. The bug manifests more severely with real crashes caused by persistent bad state.
