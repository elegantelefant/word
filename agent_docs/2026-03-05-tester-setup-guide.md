# Tester Setup Guide — Elefant Word Add-in

**Date:** 2026-03-05
**Time:** ~15 minutes from zero to task pane open

---

## Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Node.js | 18+ | `node -v` |
| pnpm | 10+ | `pnpm -v` |
| Microsoft Word | Desktop (Windows/Mac) or Word Online | — |
| Git | any | `git -v` |

**Install pnpm** (if missing):
```sh
corepack enable && corepack prepare pnpm@latest --activate
```

---

## Step-by-Step Setup

### 1. Clone and install

```sh
git clone <repo-url>
cd word_plugin
pnpm install
```

### 2. Create environment file

```sh
cp .env.example .env
```

Edit `.env` if you need to override defaults:

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `https://api.elefant.legal` | Elefant backend API |
| `VITE_GEMINI_BASE_URL` | `https://gateway.pydantic.dev/proxy/google` | Gemini proxy (optional, for free-tier BYOK) |

For most testers, the defaults are fine — leave `.env` as-is.

### 3. Install HTTPS dev certificates

Office Add-ins **require** HTTPS. This installs a locally-trusted self-signed cert:

```sh
pnpm certs
```

This creates files in `~/.office-addin-dev-certs/`. You may be prompted for your system password to trust the certificate.

**Verify certs installed:**
```sh
ls ~/.office-addin-dev-certs/localhost.key ~/.office-addin-dev-certs/localhost.crt
```

### 4. Start the dev server

```sh
pnpm dev
```

You should see:
```
  VITE v7.x.x  ready in XXX ms

  ➜  Local:   https://localhost:3000/
```

**Verify in browser:** Open `https://localhost:3000/` — you should see the Elefant UI with no certificate warnings. If you get a cert warning, the certificate trust step (#3) didn't fully complete. On macOS, open Keychain Access and trust the `localhost` cert manually.

### 5. Sideload the manifest into Word

The manifest file is `manifest.xml` in the project root. It tells Word to load the task pane from `https://localhost:3000/`.

#### Word Desktop (Mac)

1. Copy the manifest to the sideload folder (create `wef` if it doesn't exist):
   ```sh
   mkdir -p ~/Library/Containers/com.microsoft.Word/Data/Documents/wef
   cp manifest.xml ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/
   ```
   Or use Finder: Cmd+Shift+G, paste the path above, drag `manifest.xml` in.
2. Open Word (or restart if already running), then open any document.
3. Go to **Home > Add-ins** — "Elefant Legal Assistant" should appear. Click it.

#### Word Desktop (Windows)

1. Open a file share folder for sideloading:
   ```
   \\localhost\c$\Users\<username>\AppData\Local\Microsoft\Office\16.0\Wef\
   ```
   Or use the Trust Center method:
   - File > Options > Trust Center > Trust Center Settings > Trusted Add-in Catalogs
   - Add a local folder path, check "Show in Menu"
2. Copy `manifest.xml` into that folder.
3. Insert > My Add-ins > Shared Folder > Elefant Legal Assistant.

#### Word Online

1. Go to [Word Online](https://www.office.com) and open a document.
2. Home > Add-ins > Upload My Add-in.
3. Browse to `manifest.xml` and upload.
4. The Elefant task pane opens automatically.

### 6. Open the task pane

On first sideload, find the add-in under **Home > Add-ins** and click it. After that, an **"Open Elefant"** button should appear in the Home tab ribbon for quick access. The task pane should show the Elefant UI with 5 tabs: Review, Clauses, Mammoth, Analysis, History.

---

## Free Tier vs Paid Tier Testing

### Free tier (BYOK)

No account needed. Get a free Gemini API key:

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API key"
3. In Elefant: click the gear icon > paste key into "API Key (BYOK)" field

You can now use the **Review** tab with your own key. History is stored locally.

### Paid tier

Requires an Elefant account:

1. In Elefant: click the gear icon > "Sign in to Elefant"
2. Complete login in the popup
3. All tabs unlock (Clauses, Mammoth, Full Analysis)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `pnpm dev` shows HTTP not HTTPS | Run `pnpm certs` and restart the dev server |
| Browser shows cert warning | Trust the cert in your OS keychain (macOS: Keychain Access; Windows: certmgr) |
| Task pane blank / won't load | Check dev server is running at `https://localhost:3000/`; check browser console for errors |
| "Elefant" button missing from ribbon | Re-copy `manifest.xml` to the sideload folder; restart Word |
| Task pane shows "Script error" | Clear the Office cache: delete `~/Library/Containers/com.microsoft.Word/Data/Library/Caches/` (Mac) |
| Login popup blocked | Allow popups for `localhost:3000` in your browser settings |
| Login dialog stays open after sign-in | Known bug (BUG-1) — close the dialog manually; your session is active |
| `pnpm install` fails | Delete `node_modules` and `pnpm-lock.yaml`, then run `pnpm install` again |

---

## Running Tests (optional)

```sh
pnpm test          # run all tests once
pnpm test:watch    # watch mode
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install dependencies |
| `pnpm certs` | Install HTTPS dev certificates |
| `pnpm dev` | Start dev server at `https://localhost:3000` |
| `pnpm build` | Production build |
| `pnpm test` | Run tests |

Dev server port: **3000**
Manifest: **`manifest.xml`** (project root)
Manual test runbook: **`agent_docs/2026-03-04-manual-test-runbook.md`**
Test predictions: **`agent_docs/2026-03-05-manual-test-predictions.md`**
