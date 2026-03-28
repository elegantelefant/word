# Elefant Word Add-in — Test Implementation Plan

> How to implement and run each test. Covers environment setup, test execution steps, and verification criteria.

---

## Environment Setup

### Dev Server (HTTP — for Playwright)

```bash
npx vite --config vite.config.test.ts
# Serves at http://localhost:5555/
```

### Dev Server (HTTPS — for Office sideloading)

```bash
pnpm dev
# Serves at https://localhost:3000/ (needs pnpm certs first)
```

### Unit Tests

```bash
pnpm test        # Run all Vitest tests
pnpm test:watch  # Watch mode
```

---

## Test Implementation

### 1. Pre-flight

- [x] **1.1 Dev server starts**: Run `npx vite --config vite.config.test.ts`, verify `http://localhost:5555/` responds with HTML.
- [x] **1.2 Page loads**: Navigate Playwright to `http://localhost:5555/`, take snapshot. Verify: banner, nav with 5 tabs, main content area, footer.
- [ ] **1.3 HTTPS**: Run `pnpm dev`, verify `https://localhost:3000/` loads without cert errors in a trusted browser.
- [ ] **1.4 Sideload in Word**: Follow `agent_docs/2026-03-05-tester-setup-guide.md`. Verify task pane opens.

### 2. Settings & Configuration

- [x] **2.1 Settings opens**: Click gear icon (button "Settings"). Verify: API Key section, Model dropdown, Sign In button.
- [x] **2.2 API key entry**: Fill textbox with test key. Close settings. Verify: Review button becomes enabled, "Add your Gemini API key" prompt disappears.
- [x] **2.3 API key show/hide**: Click Show → button text changes to "Hide", input type changes to text. Click Hide → reverts.
- [x] **2.4 Model picker**: Open combobox. Verify 3 options: Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.0 Flash.
- [x] **2.5 Model persistence**: Change model, close/reopen settings. Verify selection persists. Reload page, verify again.
- [ ] **2.6 Sign-in**: Click "Sign in to Elefant". In Office: dialog opens. In browser: new tab opens. Verify auth flow completes.
- [ ] **2.7-2.9 Paid tier**: Requires authenticated Elefant account. Verify: tier badge changes to "Pro", API key section hides, account info shows.

### 3. Review Panel — Free Tier

- [x] **3.1-3.2 Scope toggle**: Verify Selection is default (checked). Click Full Document. Verify it becomes checked.
- [x] **3.3 Custom instructions**: Type into textarea. Verify text appears.
- [x] **3.4-3.5 Button state**: Without API key: button disabled + yellow prompt. With API key: button enabled.
- [x] **3.6-3.7 Outside Office error**: Click Review. Verify red error banner: "This feature requires Microsoft Word." Click ✕ to dismiss.
- [ ] **3.8-3.12 Review with text**: In Word, select text, click Review. Verify: "Reviewing..." loading state, then summary + issue cards with severity badges + suggestions + Insert buttons.
- [ ] **3.13 Short text**: In Word, select <10 chars. Verify: "at least 10 characters" error.
- [ ] **3.14 Custom instructions affect output**: Run review with specific instructions. Verify output reflects them.

### 4. Review Panel — Paid Tier

- [ ] **3.15-3.18**: Sign in, select text, click Review. Verify: job created via API, polling state, results display, review NOT in local history.

### 5. Insert Text

- [ ] **4.1-4.3**: Run review with suggestions. Click Insert. Verify text inserted at cursor. Ctrl+Z to undo.

### 6. History

- [x] **5.1 Empty state**: Switch to History tab. Verify: clock icon + "No review history yet" message.
- [ ] **5.2-5.3 Local history**: Run free review, switch to History. Verify entry appears. Run another, verify prepended.
- [ ] **5.4-5.7 API history**: Sign in, switch to History. Verify: loading state, job list, status badges, date formatting.

### 7. Clauses (Paid Only)

- [x] **6.1 Free tier gate**: Verify Clauses tab disabled + lock icon + "Requires Elefant Pro" tooltip.
- [ ] **6.2-6.6 Paid features**: Sign in. Verify: databases load, search/filter, expand clause, insert into document, empty state.

### 8. Mammoth (Paid Only)

- [x] **7.1 Free tier gate**: Verify Mammoth tab disabled + lock icon.
- [ ] **7.2-7.8 Paid features**: Sign in. Verify: request list, create form, validation, submit, attach text, status badges, empty state.

### 9. Full Analysis (Paid Only)

- [x] **8.1 Free tier gate**: Verify Analysis tab disabled + lock icon.
- [ ] **8.2-8.5 Paid features**: Sign in, select text. Verify: parallel jobs, review results, research report, 404 fallback.

### 10. Error Handling

- [ ] **9.1 Network error**: Disconnect network, attempt review. Verify error message.
- [ ] **9.2 Expired token**: Use invalid token. Verify "Session expired" message.
- [ ] **9.3 Rate limit**: Trigger 429. Verify message.
- [x] **9.4-9.5 ErrorBoundary**: Forced crash via React fiber dispatch (injected throwing state updater on App component). Verified: "Something went wrong" fallback UI with error message displayed. "Try again" button fully remounts App — all tabs, panels, footer restored.

### 11. Layout & Responsiveness

- [x] **10.1 All tabs visible**: Take snapshot. Verify: Review, Clauses (locked), Mammoth (locked), Analysis (locked), History.
- [x] **10.2 Tab switching**: Click Review → History → Review. Verify correct panel renders.
- [x] **10.3 320px reflow**: Resize to 320x700. Take screenshot. Verify: no clipping, text wraps, tabs compress.
- [x] **10.4 Settings gear**: Visible on all tabs. Click opens settings, Close returns to previous tab.
- [x] **10.5 Footer**: Verify "v0.1.0b" and "Free" badge.

### 12. HTTPS & Dev Server

- [x] **11.1 Browser load**: Navigate to dev server URL. Verify page loads.
- [ ] **11.2 Word task pane**: Sideload manifest, open task pane in Word.

---

## Bug Fix Implementation

When a bug is found during testing:

1. Add the bug to `spec.md` in the **Bugs Encountered** table with description and severity.
2. Add a new section below with the fix plan:

```markdown
### Bug Fix: BUG-XX — [description]

**Root cause:** [what's wrong]
**Files:** [which files to change]
**Steps:**
1. [specific change]
2. [verification]
**Status:** [ ] Not started
```

---

## Code Review Fixes (from `agent_docs/2026-03-24-code-review-fixes.md`)

These 12 issues were found by code review and have fix plans. They should be verified during testing:

- [x] **Fix 1**: Flash of UpgradePrompt for paid users (auth starts free, loads async)
- [x] **Fix 2**: `safeSetItem` silently swallows errors
- [x] **Fix 3**: `login` catch swallows all errors
- [x] **Fix 4**: `useJob` is dead production code (kept with NOTE comments — deletion needs user permission)
- [x] **Fix 5**: ReviewPanel never passes AbortSignal
- [x] **Fix 6**: ABOUTME comments don't match code
- [x] **Fix 7**: `onAuthErrorCallback` can throw and prevent ApiError(401)
- [x] **Fix 8**: `visitedTabs` ref works by coincidence
- [x] **Fix 9**: Agent signal only checked between events (ADK limitation)
- [x] **Fix 10**: Double-logout on 401
- [x] **Fix 11**: FullAnalysisPanel wrong error message outside Office
- [x] **Fix 12**: LockIcon visual changed from solid to outlined

---

### Bug Fix: BUG-1 — ToggleGroup arrow keys don't move focus

**Root cause:** `handleKeyDown` in `ToggleGroup.tsx` calls `onChange()` to update checked state but never calls `.focus()` on the newly selected radio button element. DOM focus stays on the previous element.
**Files:** `src/components/ToggleGroup.tsx`
**Steps:**
1. After calling `onChange`, focus the next radio button element via ref or DOM query
2. Verify: ArrowRight on Selection should focus+check Full Document; ArrowLeft should return
**Status:** [x] Fixed
