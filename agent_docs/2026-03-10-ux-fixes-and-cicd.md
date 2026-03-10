# UX Fixes + CI/CD Recommendations

## Issue 1: Cold first-run experience

**Problem:** A new free-tier user lands on the Review tab and sees a disabled button + amber text "Enter your Gemini API key in Settings to review." They have to discover the gear icon, navigate to settings, understand BYOK, get a key from Google, paste it, come back. Too many steps with no guidance.

**Recommendation: Replace the Review tab content with a setup wizard when no API key is set.**

When `!settings.apiKey && tier === "free"`:

```
┌─────────────────────────────┐
│  Welcome to Elefant         │
│                             │
│  To get started, you need   │
│  a free Gemini API key.     │
│                             │
│  1. Get a key from          │
│     Google AI Studio →      │
│                             │
│  2. Paste it here:          │
│     ┌───────────────────┐   │
│     │ AIza...           │   │
│     └───────────────────┘   │
│                             │
│     [Save & Start] button   │
│                             │
│  ─────────────────────────  │
│  Have an Elefant account?   │
│  Sign in for full features  │
│  [Sign in] link             │
└─────────────────────────────┘
```

This puts the API key input *on the Review panel itself* (not buried in settings) and links directly to Google AI Studio. Once saved, it transitions to the normal Review UI. No new components needed — just a conditional block at the top of `ReviewPanel`.

**Effort:** ~30 min. One `if (!settings.apiKey && tier === "free")` block in ReviewPanel.tsx.

---

## Issue 3: Three paywalled tabs deflate free users

**Problem:** 3 of 5 tabs (Clauses, Mammoth, Analysis) show identical lock screens. Free users click around and hit "requires Elefant Pro" three times. Feels like a demo that barely works.

**Recommendation: Show only 2 tabs for free users — Review and History.**

In `Layout.tsx`, filter TABS based on tier:

```tsx
const visibleTabs = tier === "paid"
  ? TABS
  : TABS.filter(t => ["review", "history"].includes(t.id));
```

Free users see a clean, focused UI. The Settings panel already has "Sign in for full features" — that's enough upsell surface. If you want a softer approach, keep all tabs visible but show them grayed out with a small lock icon (no click), and a single "Unlock all features — Sign in" banner above the tab bar.

**Effort:** ~15 min for hiding tabs. ~30 min for the grayed-out + lock icon approach.

---

## Issue 4: "Mammoth" means nothing to end users

**Problem:** "Mammoth" is an internal product name. A solo practitioner opening this tab has no idea what it does. The paywall screen says "Mammoth requires Elefant Pro" — unhelpful.

**Recommendation: Rename to "Requests".**

The panel creates and tracks legal requests (review, research, draft, extraction, analysis). "Requests" describes what it does. Changes needed:
- `Layout.tsx`: change label from `"Mammoth"` to `"Requests"`
- `MammothPanel.tsx` → rename file to `RequestsPanel.tsx` (optional, not user-facing)
- `UpgradePrompt` call: change feature from `"Mammoth"` to `"Legal Requests"`

**Effort:** ~10 min. Three string changes + optional file rename.

---

## Issue 5: Broken experience when opened in a browser

**Problem:** Someone clicking the Cloud Run URL in a browser sees the full Review UI, tries to click "Review", gets "Please select some text" because Office.js isn't loaded. The app looks broken.

**Recommendation: Show a landing page when not running inside Office.**

In `App.tsx` or `main.tsx`, check `isOfficeReady()` after mount. If false, render a simple landing page instead of the task pane:

```
┌─────────────────────────────┐
│       🐘 Elefant            │
│  Legal AI for Microsoft Word│
│                             │
│  This is a Word add-in.     │
│  To use it:                 │
│                             │
│  📄 Download manifest.xml   │
│  📖 Installation guide      │
│                             │
│  Or open Word and load      │
│  the add-in from there.     │
└─────────────────────────────┘
```

Links to `/manifest.xml` and the install guide. This turns a confusing dead-end into a useful onboarding page.

**Effort:** ~30 min. New conditional in App.tsx + a small `LandingPage` component.

---

## Issue 6: Version + tier indicator ✅ DONE

Added a footer to Layout showing `v1.0.0` and `Free`/`Pro` badge. Version injected from `package.json` at build time via Vite `define`.

---

## CI/CD: Current state and options

### How your other services are deployed

Your existing Cloud Run services use **Cloud Build triggers connected to GitHub**:

- `nuxt-staging-deploy-elefant` → triggers on push to `dev` branch of `elegantelefant/elefant_frontend`
- `nuxt-prod-deploy-elefant` → triggers on push to `main` branch
- Both use a `cloudbuild.yaml` in the repo and a service account (`elefant-dev@` / `elefantprod@`)
- Substitution variables handle env differences (`_ENVIRONMENT`, `_NODE_ENV`)

### Current word plugin deployment

Manual: `pnpm deploy` runs locally, builds Docker image, pushes to Artifact Registry, deploys to Cloud Run. No CI/CD.

### Recommendation: Same pattern as your other services

1. **Push the word plugin to a GitHub repo** (e.g., `elegantelefant/elefant-word-plugin`)
2. **Add a `cloudbuild.yaml`** that:
   - Installs pnpm + deps
   - Runs `pnpm build`
   - Builds the Docker image
   - Pushes to Artifact Registry
   - Deploys to Cloud Run
3. **Create a Cloud Build trigger** that fires on push to `main`

Example `cloudbuild.yaml`:
```yaml
steps:
  # Install and build
  - name: node:22-alpine
    entrypoint: sh
    args:
      - -c
      - npm install -g pnpm && pnpm install --frozen-lockfile && pnpm build

  # Build Docker image
  - name: gcr.io/cloud-builders/docker
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/elefant-word:$COMMIT_SHA', '.']

  # Push
  - name: gcr.io/cloud-builders/docker
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/elefant-word:$COMMIT_SHA']

  # Deploy
  - name: gcr.io/cloud-builders/gcloud
    args:
      - run
      - deploy
      - elefant-word
      - --image=us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/elefant-word:$COMMIT_SHA
      - --region=us-central1
      - --port=8080
      - --allow-unauthenticated

images:
  - us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/elefant-word:$COMMIT_SHA
```

### Version tracking

With CI/CD in place, the version stays in sync automatically:
- Bump `version` in `package.json` → Vite injects it at build time → footer shows it
- The Docker image is tagged with `$COMMIT_SHA` for traceability
- Cloud Run revision names map to specific commits

You could also inject the git SHA as a build arg if you want `v1.0.0 (abc123)` in the footer.
