# Manual Test Runbook — Elefant Word Add-in

**Tester:** _______________
**Date:** 2026-03-04
**Environment:** Word Desktop / Word Online (circle one)
**Dev server URL:** `https://localhost:3000`
**API URL:** _______________

**Legend:** ✅ Pass | ❌ Fail | ⏭️ Skipped | ⚠️ Partial

---

## Pre-flight

- [ ] Dev server running (`pnpm dev`)
- [ ] HTTPS serving without cert errors
- [ ] Manifest sideloaded into Word
- [ ] Task pane opens

**Notes:**


---

## 1. Settings & Configuration

### 1.1 — Gemini API Key (Free Tier)

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 1 | Open Settings (gear icon) | Settings panel opens | | |
| 2 | Enter Gemini API key | Key accepted, saved | | |
| 3 | Toggle show/hide on API key | Key masked/revealed | | |
| 4 | Close Settings, reopen | Key persists | | |
| 5 | Reload task pane, open Settings | Key still persisted | | |

### 1.2 — Model Selection

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 6 | Open model picker | Gemini models listed | | |
| 7 | Change model | Selection saved | | |
| 8 | Close/reopen Settings | Model persists | | |

### 1.3 — Sign In (Paid Tier)

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 9 | Click "Sign in" button | Login dialog opens | | |
| 10 | Complete login flow | Dialog closes, tier changes to paid | | |
| 11 | Settings shows account info | Name/org displayed, API key section hidden | | |
| 12 | Click "Sign out" | Reverts to free tier | | |

**Notes:**


---

## 2. Review — Free Tier

### 2.1 — Selection Scope

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 13 | Select text in Word (2+ sentences) | Text highlighted | | |
| 14 | Ensure scope = "Selection" | Toggle shows Selection active | | |
| 15 | Click "Review" | Loading state: "Reviewing..." | | |
| 16 | Wait for result | Summary displayed | | |
| 17 | Issue cards shown | Severity badges visible | | |
| 18 | Issue location shown | Clause/section reference | | |
| 19 | Suggestion + "Insert" button shown | At least one suggestion present | | |

### 2.2 — Document Scope

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 20 | Switch scope to "Full Document" | Toggle shows Document active | | |
| 21 | Click "Review" | Reads entire document body | | |
| 22 | Results display | Summary + issues for full doc | | |

### 2.3 — Custom Instructions

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 23 | Type custom instructions in textarea | Text accepted | | |
| 24 | Click "Review" | Instructions affect output | | |

### 2.4 — Edge Cases

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 25 | Select very short text (<10 chars) | "at least 10 characters" error | | |
| 26 | Select nothing, scope = Selection | Appropriate error | | |

**Notes:**


---

## 3. Review — Paid Tier

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 27 | Sign in (if not already) | Paid tier active | | |
| 28 | Select text, click "Review" | Job created via Elefant API | | |
| 29 | Polling state visible | Loading indicator | | |
| 30 | Job completes | Results displayed (same format as free) | | |
| 31 | Check History tab | Review does NOT appear in local history | | |

**Notes:**


---

## 4. Insert Text

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 32 | Run a review with suggestions | At least one "Insert" button | | |
| 33 | Place cursor in document | Cursor positioned | | |
| 34 | Click "Insert" on a suggestion | Text inserted at cursor/replaces selection | | |
| 35 | Undo (Ctrl+Z) | Insertion reverted | | |

**Notes:**


---

## 5. History Tab

### 5.1 — Local History (Free Tier)

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 36 | Run a free-tier review | Review completes | | |
| 37 | Switch to History tab | Review appears at top | | |
| 38 | Run another review | New one prepended | | |

### 5.2 — API History (Paid Tier)

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 39 | Sign in | Paid tier | | |
| 40 | Switch to History tab | Loading state shown | | |
| 41 | API jobs load | Activity feed displayed | | |
| 42 | Status badges shown | queued/running/completed/failed | | |
| 43 | Date formatting correct | Readable timestamps | | |

**Notes:**


---

## 6. Clauses Tab (Paid Only)

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 44 | Free tier: open Clauses tab | UpgradePrompt shown | | |
| 45 | Sign in, open Clauses tab | Databases load | | |
| 46 | Select database (if >1) | Clauses load for selection | | |
| 47 | Search/filter clauses | List filters by name/content | | |
| 48 | Expand a clause | Full content visible | | |
| 49 | Category badge visible | Badge displayed | | |
| 50 | Click "Insert into document" | Clause text inserted into Word | | |
| 51 | Empty state (no clauses) | Appropriate message | | |

**Notes:**


---

## 7. Mammoth Tab (Paid Only)

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 52 | Free tier: open Mammoth tab | UpgradePrompt shown | | |
| 53 | Sign in, open Mammoth tab | Existing requests load | | |
| 54 | Toggle to Create view | Form displayed | | |
| 55 | Fill form: title, type, priority, description | Fields accept input | | |
| 56 | Submit without title | Validation error | | |
| 57 | Submit valid form | createLegalRequest fires | | |
| 58 | Success → list refreshes | New request appears | | |
| 59 | "Attach selected text" | Selected Word text attached | | |
| 60 | Request list: status badges | Badges render correctly | | |
| 61 | Empty state | Appropriate message | | |

**Notes:**


---

## 8. Full Analysis Tab (Paid Only)

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 62 | Free tier: open Full Analysis tab | UpgradePrompt shown | | |
| 63 | Sign in, select text | Ready to analyze | | |
| 64 | Click "Analyze" | "Analyzing..." loading state | | |
| 65 | Parallel jobs fire (review + research) | Both run concurrently | | |
| 66 | Review results display | Summary + issues | | |
| 67 | Research report displays | Report content shown | | |
| 68 | Scope toggle works | Selection vs Document | | |
| 69 | Short text validation | Error for <10 chars | | |
| 70 | Research 404 → graceful fallback | Review still shows, research shows fallback | | |

**Notes:**


---

## 9. Error Handling

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 71 | Disconnect network, attempt review | NetworkError displayed | | |
| 72 | Use expired/invalid token | "Session expired" + sign-in prompt | | |
| 73 | Trigger rate limit (if possible) | 429 message displayed | | |
| 74 | Force a component crash (dev tools) | ErrorBoundary catches, "Try again" shown | | |
| 75 | Click "Try again" | Component resets | | |

**Notes:**


---

## 10. Layout & Responsiveness

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 76 | All 5 tabs visible in header | Review, Clauses, Mammoth, Analysis, History | | |
| 77 | Tab switching | Correct panel renders each time | | |
| 78 | Resize task pane to ~320px width | Content reflows, no overflow/clipping | | |
| 79 | Settings gear always accessible | Visible regardless of active tab | | |

**Notes:**


---

## 11. HTTPS & Dev Server

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 80 | Navigate to dev server URL in browser | Page loads, no cert errors | | |
| 81 | Task pane loads in Word | No mixed content or cert warnings | | |

**Notes:**


---

## Summary

| Section | Total | ✅ | ❌ | ⏭️ | ⚠️ |
|---------|-------|----|----|----|-----|
| Pre-flight | 4 | | | | |
| Settings & Config | 12 | | | | |
| Review — Free | 14 | | | | |
| Review — Paid | 5 | | | | |
| Insert Text | 4 | | | | |
| History | 8 | | | | |
| Clauses | 8 | | | | |
| Mammoth | 10 | | | | |
| Full Analysis | 9 | | | | |
| Error Handling | 5 | | | | |
| Layout & Responsiveness | 4 | | | | |
| HTTPS & Dev Server | 2 | | | | |
| **Total** | **85** | | | | |

## Blockers / Issues Found

| # | Test | Issue | Severity | Ticket? |
|---|------|-------|----------|---------|
| | | | | |
| | | | | |
| | | | | |

## Overall Assessment

**Status:** _______________
**Confidence to ship:** Low / Medium / High
**Key blockers:**


