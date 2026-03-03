# Complete Test Checklist — Elefant Word Add-in

Every interaction and function that needs testing, grouped by layer.

---

## 1. API Endpoints (Integration — `agent_tests/integration.sh`)

| # | Endpoint | Method | Used by | Status |
|---|----------|--------|---------|--------|
| 1 | `/health` | GET | health check | `integration.sh` |
| 2 | `/ready` | GET | health check | `integration.sh` |
| 3 | `/whoami` | GET | `api/account.ts` | `integration.sh` |
| 4 | `/me` | GET | `api/account.ts`, `hooks/useAuth.ts` | `integration.sh` |
| 5 | `/me` (bad token) | GET | error handling | `integration.sh` |
| 6 | `/me` (no auth) | GET | error handling | `integration.sh` |
| 7 | `/review` | POST | `api/review.ts` (reviewPaid) | `integration.sh` |
| 8 | `/jobs` | GET | `api/jobs.ts` (listJobs) | `integration.sh` |
| 9 | `/jobs?status=completed` | GET | `api/jobs.ts` (listJobs with filter) | `integration.sh` |
| 10 | `/jobs?type=review` | GET | `api/jobs.ts` (listJobs with filter) | `integration.sh` |
| 11 | `/jobs/{id}` | GET | `lib/polling.ts` (pollForResult) | `integration.sh` |
| 12 | `/jobs/{id}/result` | GET | `lib/polling.ts`, `api/jobs.ts` | `integration.sh` |
| 13 | `/clause-databases` | GET | `api/clauses.ts` | `integration.sh` |
| 14 | `/clause-databases/{id}/clauses` | GET | `api/clauses.ts` | `integration.sh` |
| 15 | `/clause-databases/{id}/suggest` | POST | `api/clauses.ts` | `integration.sh` |
| 16 | `/legal-requests` | GET | `api/mammoth.ts` | `integration.sh` |
| 17 | `/legal-requests` | POST | `api/mammoth.ts` | `integration.sh` |
| 18 | `/legal-requests/{id}` | GET | `api/mammoth.ts` | `integration.sh` |
| 19 | `/legal-requests/{id}/execute` | POST | `api/mammoth.ts` | `integration.sh` |
| 20 | `/research` | POST | `FullAnalysisPanel.tsx` | `integration.sh` |
| 21 | `/auth/login?redirect=office-addin` | GET | `api/auth.ts` (openLoginDialog) | Manual only |

---

## 2. API Client Functions (Unit — `agent_tests/`)

| # | Function | File | Test file | Covered |
|---|----------|------|-----------|---------|
| 22 | `apiFetch()` — success | `api/client.ts` | `client.test.ts` | ✅ |
| 23 | `apiFetch()` — 401 ApiError | `api/client.ts` | `client.test.ts` | ✅ |
| 24 | `apiFetch()` — 429 ApiError | `api/client.ts` | `client.test.ts` | ✅ |
| 25 | `apiFetch()` — generic ApiError | `api/client.ts` | `client.test.ts` | ✅ |
| 26 | `apiFetch()` — NetworkError | `api/client.ts` | `client.test.ts` | ✅ |
| 27 | `apiFetch()` — AbortError passthrough | `api/client.ts` | `client.test.ts` | ✅ |
| 28 | `apiFetch()` — POST with body | `api/client.ts` | `client.test.ts` | ✅ |
| 29 | `reviewFree()` — calls runReview, maps result | `api/review.ts` | `review.test.ts` | ✅ |
| 30 | `reviewFree()` — passes custom instructions | `api/review.ts` | `review.test.ts` | ✅ |
| 31 | `reviewFree()` — propagates agent errors | `api/review.ts` | `review.test.ts` | ✅ |
| 32 | `reviewPaid()` — creates job + polls | `api/review.ts` | `review.test.ts` | ✅ |
| 33 | `listJobs()` — no filters | `api/jobs.ts` | `jobs.test.ts` | ✅ |
| 34 | `listJobs()` — status filter | `api/jobs.ts` | `jobs.test.ts` | ✅ |
| 35 | `listJobs()` — type filter | `api/jobs.ts` | `jobs.test.ts` | ✅ |
| 36 | `listJobs()` — both filters | `api/jobs.ts` | `jobs.test.ts` | ✅ |
| 37 | `getJobResult()` | `api/jobs.ts` | `jobs.test.ts` | ✅ |
| 38 | `getMe()` | `api/account.ts` | — | ❌ |
| 39 | `whoami()` | `api/account.ts` | — | ❌ |
| 40 | `listClauseDatabases()` | `api/clauses.ts` | — | ❌ |
| 41 | `listClauses()` | `api/clauses.ts` | — | ❌ |
| 42 | `suggestClause()` | `api/clauses.ts` | — | ❌ |
| 43 | `createLegalRequest()` | `api/mammoth.ts` | — | ❌ |
| 44 | `listLegalRequests()` | `api/mammoth.ts` | — | ❌ |
| 45 | `getLegalRequest()` | `api/mammoth.ts` | — | ❌ |
| 46 | `executeLegalRequest()` | `api/mammoth.ts` | — | ❌ |
| 47 | `pollForResult()` — completed job | `lib/polling.ts` | `polling.test.ts` | ✅ |
| 48 | `pollForResult()` — failed job | `lib/polling.ts` | `polling.test.ts` | ✅ |
| 49 | `pollForResult()` — timeout (max attempts) | `lib/polling.ts` | `polling.test.ts` | ✅ |
| 50 | `pollForResult()` — polls until complete | `lib/polling.ts` | `polling.test.ts` | ✅ |

---

## 3. Auth Module (Unit + Manual)

| # | Function | File | Test file | Covered |
|---|----------|------|-----------|---------|
| 51 | `getSavedToken()` — returns saved token | `api/auth.ts` | `auth.test.ts` | ✅ |
| 52 | `getSavedToken()` — returns null when empty | `api/auth.ts` | `auth.test.ts` | ✅ |
| 53 | `saveToken()` — persists to localStorage | `api/auth.ts` | `auth.test.ts` | ✅ |
| 54 | `clearToken()` — removes from localStorage | `api/auth.ts` | `auth.test.ts` | ✅ |
| 55 | `openLoginDialog()` — Office dialog flow | `api/auth.ts` | — | ❌ Manual: sideload |
| 56 | `openLoginDialog()` — browser popup fallback | `api/auth.ts` | — | ❌ Manual: dev server |
| 57 | `openLoginDialog()` — popup blocked error | `api/auth.ts` | — | ❌ Manual |
| 58 | `openLoginDialog()` — timeout after 5 min | `api/auth.ts` | — | ❌ Manual |

---

## 4. Store / Context (Unit)

| # | Interaction | File | Test file | Covered |
|---|-------------|------|-----------|---------|
| 59 | `AUTH_INITIAL` defaults | `store/auth.ts` | `auth-store.test.tsx` | ✅ |
| 60 | `useAuth()` — throws outside provider | `store/auth.ts` | `auth-store.test.tsx` | ✅ |
| 61 | `useAuth()` — returns context value | `store/auth.ts` | `auth-store.test.tsx` | ✅ |
| 62 | `useAuth()` — login/logout callable | `store/auth.ts` | `auth-store.test.tsx` | ✅ |
| 63 | `loadSettings()` — returns defaults | `store/settings.ts` | `settings.test.ts` | ✅ |
| 64 | `loadSettings()` — loads from localStorage | `store/settings.ts` | `settings.test.ts` | ✅ |
| 65 | `loadSettings()` — handles corrupt data | `store/settings.ts` | `settings.test.ts` | ✅ |
| 66 | `loadSettings()` — fills missing fields | `store/settings.ts` | `settings.test.ts` | ✅ |
| 67 | `saveSettings()` — persists to localStorage | `store/settings.ts` | `settings.test.ts` | ✅ |
| 68 | `useSettings()` — throws outside provider | `store/settings.ts` | — | ❌ |

---

## 5. Hooks (Unit)

| # | Interaction | File | Test file | Covered |
|---|-------------|------|-----------|---------|
| 69 | `useJob()` — starts idle | `hooks/useJob.ts` | `hooks.test.ts` | ✅ |
| 70 | `useJob().poll()` — transitions to completed | `hooks/useJob.ts` | `hooks.test.ts` | ✅ |
| 71 | `useJob().poll()` — transitions to failed | `hooks/useJob.ts` | `hooks.test.ts` | ✅ |
| 72 | `useJob().reset()` — back to idle | `hooks/useJob.ts` | `hooks.test.ts` | ✅ |
| 73 | `useAuthProvider()` — loads saved token on mount | `hooks/useAuth.ts` | — | ❌ |
| 74 | `useAuthProvider()` — login with token | `hooks/useAuth.ts` | — | ❌ |
| 75 | `useAuthProvider()` — login opens dialog | `hooks/useAuth.ts` | — | ❌ |
| 76 | `useAuthProvider()` — logout clears state | `hooks/useAuth.ts` | — | ❌ |
| 77 | `useAuthProvider()` — determines tier from account_type | `hooks/useAuth.ts` | — | ❌ |
| 78 | `useAuthProvider()` — clears token on getMe() failure | `hooks/useAuth.ts` | — | ❌ |
| 79 | `useDocument().readSelection()` | `hooks/useDocument.ts` | — | ❌ Office.js |
| 80 | `useDocument().readBody()` | `hooks/useDocument.ts` | — | ❌ Office.js |
| 81 | `useDocument()` — error when Office not ready | `hooks/useDocument.ts` | — | ❌ |

---

## 6. ADK Agent (Unit)

| # | Interaction | File | Test file | Covered |
|---|-------------|------|-----------|---------|
| 82 | `createReviewRunner()` — instantiates runner | `lib/agent.ts` | — | ❌ |
| 83 | `runReview()` — returns structured result | `lib/agent.ts` | — | ❌ (mocked in review.test.ts) |
| 84 | `runReview()` — throws when no result from agent | `lib/agent.ts` | — | ❌ |
| 85 | `runReview()` — includes custom instructions | `lib/agent.ts` | — | ❌ |
| 86 | `reviewSchema` — validates correct data | `lib/agent.ts` | — | ❌ |
| 87 | `reviewSchema` — rejects invalid data | `lib/agent.ts` | — | ❌ |

---

## 7. Office.js Helpers (Manual — requires Word runtime)

| # | Interaction | File | Covered |
|---|-------------|------|---------|
| 88 | `getSelectedText()` — returns selection text | `lib/office.ts` | ❌ Manual |
| 89 | `getSelectedText()` — empty selection | `lib/office.ts` | ❌ Manual |
| 90 | `getDocumentBody()` — returns full body text | `lib/office.ts` | ❌ Manual |
| 91 | `insertText()` — replaces selection | `lib/office.ts` | ❌ Manual |
| 92 | `insertText()` — inserts at end | `lib/office.ts` | ❌ Manual |
| 93 | `isOfficeReady()` — true in Word | `lib/office.ts` | ❌ Manual |
| 94 | `isOfficeReady()` — false in browser | `lib/office.ts` | ❌ Manual |

---

## 8. Components — Layout & Chrome (Unit)

| # | Interaction | File | Test file | Covered |
|---|-------------|------|-----------|---------|
| 95 | Layout renders header + all 5 tabs | `Layout.tsx` | `components.test.tsx` | ✅ |
| 96 | Layout tab click fires onTabChange | `Layout.tsx` | `components.test.tsx` | ✅ |
| 97 | Layout settings gear fires onSettingsClick | `Layout.tsx` | `components.test.tsx` | ✅ |
| 98 | UpgradePrompt renders feature name | `UpgradePrompt.tsx` | `components.test.tsx` | ✅ |
| 99 | ErrorBoundary renders children | `ErrorBoundary.tsx` | `components.test.tsx` | ✅ |
| 100 | ErrorBoundary catches thrown error | `ErrorBoundary.tsx` | `components.test.tsx` | ✅ |
| 101 | ErrorBoundary "Try again" resets | `ErrorBoundary.tsx` | — | ❌ |

---

## 9. SettingsPanel (Unit)

| # | Interaction | File | Test file | Covered |
|---|-------------|------|-----------|---------|
| 102 | Renders settings header + close button | `SettingsPanel.tsx` | `settings-panel.test.tsx` | ✅ |
| 103 | Shows Gemini models in picker | `SettingsPanel.tsx` | `settings-panel.test.tsx` | ✅ |
| 104 | Shows API key input (free tier) | `SettingsPanel.tsx` | `settings-panel.test.tsx` | ✅ |
| 105 | Links to Google AI Studio | `SettingsPanel.tsx` | `settings-panel.test.tsx` | ✅ |
| 106 | Model change calls updateSettings | `SettingsPanel.tsx` | `settings-panel.test.tsx` | ✅ |
| 107 | API key change calls updateSettings | `SettingsPanel.tsx` | `settings-panel.test.tsx` | ✅ |
| 108 | Shows sign-in button (free tier) | `SettingsPanel.tsx` | `settings-panel.test.tsx` | ✅ |
| 109 | Shows account info (paid tier) | `SettingsPanel.tsx` | `settings-panel.test.tsx` | ✅ |
| 110 | Hides API key input for paid tier | `SettingsPanel.tsx` | `settings-panel.test.tsx` | ✅ |
| 111 | Close button fires onClose | `SettingsPanel.tsx` | `settings-panel.test.tsx` | ✅ |
| 112 | Show/hide API key toggle | `SettingsPanel.tsx` | — | ❌ |
| 113 | Sign-in button calls login() | `SettingsPanel.tsx` | — | ❌ |
| 114 | Sign-out button calls logout() | `SettingsPanel.tsx` | — | ❌ |

---

## 10. ReviewPanel (Unit)

| # | Interaction | File | Test file | Covered |
|---|-------------|------|-----------|---------|
| 115 | Renders scope toggle, textarea, button | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 116 | Disables button without API key (free) | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 117 | Disables button without token (paid) | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 118 | Scope toggle switches active class | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 119 | Shows error when text too short | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 120 | Calls reviewFree, displays summary | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 121 | Displays issue cards with severity badges | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 122 | Displays issue location | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 123 | Displays suggestion + Insert button | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 124 | Shows issues count header | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 125 | Saves to local history (free tier) | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 126 | Uses full document text when scope=document | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 127 | Calls reviewPaid when authenticated | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 128 | Displays errors from review failures | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 129 | Issue without kind defaults to "other" | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 130 | Issue without location/suggestion OK | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 131 | "Reviewing..." loading state | `ReviewPanel.tsx` | `review-panel.test.tsx` | ✅ |
| 132 | Insert button calls insertText() | `ReviewPanel.tsx` | — | ❌ Office.js |
| 133 | Does NOT save to history for paid tier | `ReviewPanel.tsx` | — | ❌ |
| 134 | Passes custom instructions to review | `ReviewPanel.tsx` | — | ❌ |

---

## 11. HistoryPanel (Unit)

| # | Interaction | File | Test file | Covered |
|---|-------------|------|-----------|---------|
| 135 | `addToLocalHistory()` — adds item | `HistoryPanel.tsx` | `history.test.ts` | ✅ |
| 136 | `addToLocalHistory()` — prepends (most recent first) | `HistoryPanel.tsx` | `history.test.ts` | ✅ |
| 137 | `addToLocalHistory()` — caps at 50 items | `HistoryPanel.tsx` | `history.test.ts` | ✅ |
| 138 | `addToLocalHistory()` — handles corrupt storage | `HistoryPanel.tsx` | `history.test.ts` | ✅ |
| 139 | Empty local history state | `HistoryPanel.tsx` | `history-panel.test.tsx` | ✅ |
| 140 | Renders local history items | `HistoryPanel.tsx` | `history-panel.test.tsx` | ✅ |
| 141 | Loading → API jobs (paid tier) | `HistoryPanel.tsx` | `history-panel.test.tsx` | ✅ |
| 142 | Empty API history state | `HistoryPanel.tsx` | `history-panel.test.tsx` | ✅ |
| 143 | API error display | `HistoryPanel.tsx` | `history-panel.test.tsx` | ✅ |
| 144 | Status badges render (queued/running/completed/failed) | `HistoryPanel.tsx` | — | ❌ |
| 145 | Date formatting | `HistoryPanel.tsx` | — | ❌ |

---

## 12. ClausesPanel (Unit)

| # | Interaction | File | Test file | Covered |
|---|-------------|------|-----------|---------|
| 146 | Shows UpgradePrompt for free tier | `ClausesPanel.tsx` | — | ❌ |
| 147 | Loads databases on mount | `ClausesPanel.tsx` | — | ❌ |
| 148 | Database selector when >1 database | `ClausesPanel.tsx` | — | ❌ |
| 149 | Loads clauses when database selected | `ClausesPanel.tsx` | — | ❌ |
| 150 | Search filters clauses by name/content | `ClausesPanel.tsx` | — | ❌ |
| 151 | Expand/collapse clause content | `ClausesPanel.tsx` | — | ❌ |
| 152 | "Insert into document" button | `ClausesPanel.tsx` | — | ❌ Office.js |
| 153 | Empty state (no clauses) | `ClausesPanel.tsx` | — | ❌ |
| 154 | Error state | `ClausesPanel.tsx` | — | ❌ |
| 155 | Category badge display | `ClausesPanel.tsx` | — | ❌ |

---

## 13. MammothPanel (Unit)

| # | Interaction | File | Test file | Covered |
|---|-------------|------|-----------|---------|
| 156 | Shows UpgradePrompt for free tier | `MammothPanel.tsx` | — | ❌ |
| 157 | Loads requests on mount | `MammothPanel.tsx` | — | ❌ |
| 158 | Toggle between list/create views | `MammothPanel.tsx` | — | ❌ |
| 159 | Create form: title, type, priority, description | `MammothPanel.tsx` | — | ❌ |
| 160 | Create form: validates title required | `MammothPanel.tsx` | — | ❌ |
| 161 | Create form: submit calls createLegalRequest | `MammothPanel.tsx` | — | ❌ |
| 162 | "Attach selected text" button | `MammothPanel.tsx` | — | ❌ Office.js |
| 163 | Request list with status badges | `MammothPanel.tsx` | — | ❌ |
| 164 | Empty requests state | `MammothPanel.tsx` | — | ❌ |
| 165 | Create success refreshes list | `MammothPanel.tsx` | — | ❌ |
| 166 | Error display | `MammothPanel.tsx` | — | ❌ |

---

## 14. FullAnalysisPanel (Unit)

| # | Interaction | File | Test file | Covered |
|---|-------------|------|-----------|---------|
| 167 | Shows UpgradePrompt for free tier | `FullAnalysisPanel.tsx` | — | ❌ |
| 168 | Scope toggle (selection/document) | `FullAnalysisPanel.tsx` | — | ❌ |
| 169 | Fires parallel review + research jobs | `FullAnalysisPanel.tsx` | — | ❌ |
| 170 | Shows review summary result | `FullAnalysisPanel.tsx` | — | ❌ |
| 171 | Shows research report result | `FullAnalysisPanel.tsx` | — | ❌ |
| 172 | Graceful fallback when research 404s | `FullAnalysisPanel.tsx` | — | ❌ |
| 173 | Error display | `FullAnalysisPanel.tsx` | — | ❌ |
| 174 | "Analyzing..." loading state | `FullAnalysisPanel.tsx` | — | ❌ |
| 175 | Short text validation | `FullAnalysisPanel.tsx` | — | ❌ |

---

## 15. App.tsx — Top Level (Unit)

| # | Interaction | File | Test file | Covered |
|---|-------------|------|-----------|---------|
| 176 | Renders with default tab (review) | `App.tsx` | — | ❌ |
| 177 | Tab switching renders correct panel | `App.tsx` | — | ❌ |
| 178 | Settings gear opens SettingsPanel | `App.tsx` | — | ❌ |
| 179 | Settings close returns to main view | `App.tsx` | — | ❌ |
| 180 | Settings persist across close/reopen | `App.tsx` | — | ❌ |

---

## 16. End-to-End (Manual — Word sideload)

| # | Scenario | Covered |
|---|----------|---------|
| 181 | Sideload manifest into Word, task pane opens | ❌ |
| 182 | Enter Gemini API key in Settings, persists after close | ❌ |
| 183 | Select text in Word → click Review → results display | ❌ |
| 184 | Click "Insert" on suggestion → text appears in document | ❌ |
| 185 | Full Document scope reads entire body | ❌ |
| 186 | Custom instructions affect review output | ❌ |
| 187 | Sign in via dialog → tier changes to paid | ❌ |
| 188 | Paid review via Elefant API (job polling) | ❌ |
| 189 | Clauses tab loads databases + clauses | ❌ |
| 190 | Insert clause into document | ❌ |
| 191 | Mammoth tab: create legal request | ❌ |
| 192 | Full Analysis: parallel jobs + results | ❌ |
| 193 | History tab: local reviews appear | ❌ |
| 194 | History tab (paid): API activity feed | ❌ |
| 195 | Error: network down → NetworkError shown | ❌ |
| 196 | Error: 401 → "Session expired" + sign-in prompt | ❌ |
| 197 | Error: 429 → rate limit message | ❌ |
| 198 | ErrorBoundary catches component crash | ❌ |
| 199 | Task pane responsive at 320px width | ❌ |
| 200 | HTTPS dev server serves without cert errors | ❌ |

---

## Summary

| Category | Total | ✅ Covered | ❌ Not covered |
|----------|-------|-----------|---------------|
| API Endpoints (integration) | 21 | 0 (script ready, needs token) | 21 |
| API Client Functions | 29 | 22 | 7 |
| Auth Module | 8 | 4 | 4 (mostly manual) |
| Store / Context | 10 | 9 | 1 |
| Hooks | 13 | 4 | 9 |
| ADK Agent | 6 | 0 | 6 |
| Office.js Helpers | 7 | 0 | 7 (manual only) |
| Layout & Chrome | 7 | 6 | 1 |
| SettingsPanel | 13 | 11 | 2 |
| ReviewPanel | 20 | 17 | 3 |
| HistoryPanel | 11 | 9 | 2 |
| ClausesPanel | 10 | 0 | 10 |
| MammothPanel | 11 | 0 | 11 |
| FullAnalysisPanel | 9 | 0 | 9 |
| App.tsx | 5 | 0 | 5 |
| End-to-End (manual) | 20 | 0 | 20 |
| **Total** | **200** | **82** | **118** |

### Priority for next round
1. **Run integration.sh** with a real token (covers 21 endpoints)
2. **`useAuthProvider` hook tests** (#73-78) — 6 tests, high value
3. **ClausesPanel + MammothPanel** (#146-166) — 21 tests, same pattern as HistoryPanel
4. **FullAnalysisPanel** (#167-175) — 9 tests
5. **Agent schema + function tests** (#82-87) — 6 tests
