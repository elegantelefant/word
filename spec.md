# Elefant Word Add-in — Test Specification

> What to test. Each section is a testable area. Checkboxes track completion.

---

## Test Results

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1.1 | Dev server starts | ✅ PASS | HTTP 200 at localhost:5555; screenshot: `1.1-dev-server-starts.png` |
| 1.2 | Page loads in browser | ⬜ REDO | Needs screenshots |
| 1.3 | HTTPS with dev certs | ⏭️ SKIP | Certs exist; Playwright can't connect to self-signed |
| 1.4 | Manifest sideloaded in Word | ⏭️ SKIP | Not testing in Word |
| 2.1 | Settings opens via gear icon | ⬜ REDO | Needs before/after screenshots |
| 2.2 | API key entry + persistence | ⬜ REDO | Needs before/after screenshots |
| 2.3 | API key show/hide toggle | ⬜ REDO | Needs before/after screenshots |
| 2.4 | Model picker — 3 models listed | ⬜ REDO | Needs before/after screenshots |
| 2.5 | Model selection persists | ⬜ REDO | Needs before/after screenshots |
| 2.6 | Sign-in button opens auth flow | ⬜ REDO | Needs before/after screenshots |
| 2.7 | Sign-in completes, tier → paid | ⏭️ SKIP | Requires real auth |
| 2.8 | Account info shown when paid | ⏭️ SKIP | Requires real auth |
| 2.9 | Sign-out reverts to free | ⏭️ SKIP | Requires real auth |
| 3.1 | Scope defaults to Selection | ⬜ REDO | Needs screenshot |
| 3.2 | Scope toggles to Full Document | ⬜ REDO | Needs before/after screenshots |
| 3.3 | Custom instructions textarea | ⬜ REDO | Needs before/after screenshots |
| 3.4 | Review button disabled without API key | ⬜ REDO | Needs screenshot |
| 3.5 | Review button enabled with API key | ⬜ REDO | Needs screenshot |
| 3.6 | Review outside Office → error | ⬜ REDO | Needs before/after screenshots |
| 3.7 | Error dismiss button works | ⬜ REDO | Needs before/after screenshots |
| 3.8 | Review with text selection | ⏭️ SKIP | Requires Office.js |
| 3.9 | Review results: summary | ⏭️ SKIP | Requires Office.js + API |
| 3.10 | Review results: issue cards | ⏭️ SKIP | Requires Office.js + API |
| 3.11 | Review results: severity badges | ⏭️ SKIP | Requires Office.js + API |
| 3.12 | Review results: suggestions + Insert | ⏭️ SKIP | Requires Office.js + API |
| 3.13 | Short text (<10 chars) error | ⏭️ SKIP | Requires Office.js to inject text; code validates at ReviewPanel.tsx:56 |
| 3.14 | Review with custom instructions | ⏭️ SKIP | Requires Office.js + API |
| 3.15 | Paid review — job creation | ⏭️ SKIP | Requires auth + Office.js |
| 3.16 | Paid review — polling state | ⏭️ SKIP | Requires auth + Office.js |
| 3.17 | Paid review — results display | ⏭️ SKIP | Requires auth + Office.js |
| 3.18 | Paid review — NOT in local history | ⏭️ SKIP | Requires auth + Office.js |
| 4.1 | Insert text at cursor | ⏭️ SKIP | Requires Office.js |
| 4.2 | Insert replaces selection | ⏭️ SKIP | Requires Office.js |
| 4.3 | Undo after insert | ⏭️ SKIP | Requires Office.js |
| 5.1 | History tab — empty state | ⬜ REDO | Needs before/after screenshots |
| 5.2 | History tab — local entry after free review | ⏭️ SKIP | Requires completed review |
| 5.3 | History tab — entries prepended | ⏭️ SKIP | Requires completed review |
| 5.4 | API history — loading state | ⏭️ SKIP | Requires auth |
| 5.5 | API history — job list | ⏭️ SKIP | Requires auth |
| 5.6 | API history — status badges | ⏭️ SKIP | Requires auth |
| 5.7 | API history — date formatting | ⏭️ SKIP | Requires auth |
| 6.1 | Clauses tab — locked for free tier | ⬜ REDO | Needs screenshot of lock icon + disabled state |
| 6.2 | Clauses tab — databases load (paid) | ⏭️ SKIP | Requires auth |
| 6.3 | Clauses — search/filter | ⏭️ SKIP | Requires auth |
| 6.4 | Clauses — expand | ⏭️ SKIP | Requires auth |
| 6.5 | Clauses — insert into document | ⏭️ SKIP | Requires auth + Office.js |
| 6.6 | Clauses — empty state | ⏭️ SKIP | Requires auth |
| 7.1 | Mammoth tab — locked for free tier | ⬜ REDO | Needs screenshot of lock icon + disabled state |
| 7.2 | Mammoth — request list (paid) | ⏭️ SKIP | Requires auth |
| 7.3 | Mammoth — create form | ⏭️ SKIP | Requires auth |
| 7.4 | Mammoth — validation (empty title) | ⏭️ SKIP | Requires auth |
| 7.5 | Mammoth — submit | ⏭️ SKIP | Requires auth |
| 7.6 | Mammoth — attach selected text | ⏭️ SKIP | Requires auth + Office.js |
| 7.7 | Mammoth — status badges | ⏭️ SKIP | Requires auth |
| 7.8 | Mammoth — empty state | ⏭️ SKIP | Requires auth |
| 8.1 | Analysis tab — locked for free tier | ⬜ REDO | Needs screenshot of lock icon + disabled state |
| 8.2 | Analysis — parallel jobs | ⏭️ SKIP | Requires auth + Office.js |
| 8.3 | Analysis — review results | ⏭️ SKIP | Requires auth + Office.js |
| 8.4 | Analysis — research report | ⏭️ SKIP | Requires auth + Office.js |
| 8.5 | Analysis — research 404 fallback | ⏭️ SKIP | Requires auth + Office.js |
| 9.1 | Network error display | ⏭️ SKIP | Requires Office.js to reach network path |
| 9.2 | 401 expired token | ⏭️ SKIP | Requires auth |
| 9.3 | 429 rate limit | ⏭️ SKIP | Requires API |
| 9.4 | ErrorBoundary catches crash | ✅ PASS | Injected throw via React fiber dispatch; shows "Something went wrong" + error message + "Try again" |
| 9.5 | ErrorBoundary "Try again" resets | ✅ PASS | Click "Try again" fully recovers app — all tabs, panels, footer restored |
| 10.1 | All 5 tabs visible | ⬜ REDO | Needs screenshot |
| 10.2 | Tab switching | ⬜ REDO | Needs before/after screenshots for each tab |
| 10.3 | 320px width reflow | ⬜ REDO | Needs screenshot at 320px |
| 10.4 | Settings gear always accessible | ⬜ REDO | Needs screenshots from multiple tabs |
| 10.5 | Footer: version + tier badge | ⬜ REDO | Needs close-up screenshot |
| 11.1 | Dev server loads in browser | ⬜ REDO | Needs screenshot |
| 11.2 | Task pane loads in Word | ⏭️ SKIP | Not testing in Word |

---

## Bugs Encountered

| Bug # | Test | Description | Severity | Fix Status |
|-------|------|-------------|----------|------------|
| BUG-1 | Keyboard a11y | ToggleGroup arrow keys change checked state but don't move DOM focus to newly selected radio button (WAI-ARIA violation) | MED | fixed |

