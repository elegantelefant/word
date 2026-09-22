# Elefant Word Add-in

AI-powered legal document review and analysis for Microsoft Word.

## Quick start (development)

```bash
pnpm install
pnpm dev          # Vite dev server on https://localhost:5173
```

Open Word → sideload `manifest.xml` (localhost) → the add-in panel loads from the dev server.

## Architecture

```
src/
├── api/           # HTTP clients (auth, review, clauses, mammoth, jobs)
├── components/    # React UI (Layout, panels, settings, upgrade prompt)
├── hooks/         # React hooks (useAuth, useDocument, useJob)
├── lib/           # Core logic (agent, history, office.js helpers, polling)
├── store/         # State management (auth, settings, UI)
└── types/         # TypeScript types
```

**Stack:** React 19, Tailwind CSS 4, Vite 7, TypeScript 5, Vitest, Playwright

**Backend:** Calls the Elefant API via the `elefant.legal/api/v1` proxy (paid tier) or Gemini via `gateway.pydantic.dev` (free BYOK tier).

## Deployment

### Prerequisites

- Docker with buildx (for `--platform linux/amd64`)
- `gcloud` CLI, authenticated: `gcloud auth login`
- Project set: `gcloud config set project psychic-mason-409615`
- Artifact Registry access: `gcloud auth configure-docker us-central1-docker.pkg.dev`

### Deploy to Cloud Run

```bash
pnpm run deploy
```

This single command:
1. Type-checks with `tsc`
2. Builds the SPA with Vite → `dist/`
3. Builds a Docker image (nginx:alpine + dist + production manifest)
4. Pushes to Artifact Registry (`us-central1-docker.pkg.dev/psychic-mason-409615/cloud-run-source-deploy/elefant-word`)
5. Deploys to Cloud Run (`elefant-word`, `us-central1`, port 8080, public)

**Service URL:** `https://elefant-word-245916757771.us-central1.run.app`

### Verify after deploy

```bash
# SPA loads
curl -s -o /dev/null -w "%{http_code}" https://elefant-word-245916757771.us-central1.run.app/

# Manifest served with correct content type
curl -s https://elefant-word-245916757771.us-central1.run.app/manifest.xml | head -5

# Installer scripts downloadable
curl -s -o /dev/null -w "%{http_code}" https://elefant-word-245916757771.us-central1.run.app/install-mac.command
```

### CI/CD (not yet connected)

A `cloudbuild.yaml` exists for automated deploys via Cloud Build. To enable:

1. Go to Cloud Build → Triggers in GCP console
2. Connect the `elegantelefant/word` GitHub repo
3. Create a trigger on push to `main`, using `cloudbuild.yaml`

The Cloud Build config tags images with `$COMMIT_SHA` for traceability.

## Manifests

| File | Purpose | URLs point to |
|------|---------|---------------|
| `manifest.xml` | Local development | `https://localhost:5173` |
| `manifest.prod.xml` | Production | `https://elefant-word-245916757771.us-central1.run.app` |

The Dockerfile copies `manifest.prod.xml` → `/usr/share/nginx/html/manifest.xml`, so production always serves the correct manifest at `/manifest.xml`.

## Nginx

`nginx.conf` handles:
- CORS headers for Office.js (`Access-Control-Allow-Origin: *`)
- `application/xml` content type for the manifest
- `Content-Disposition: attachment` on `.command` and `.bat` installer scripts
- SPA fallback (`try_files → /index.html`)
- 1-year cache on `/assets/` (Vite-hashed filenames)

## User installation

See [`agent_docs/2026-03-05-user-install-guide.md`](agent_docs/2026-03-05-user-install-guide.md) for end-user instructions covering:
- **Word Online** — upload manifest via Add-ins dialog
- **Mac Desktop** — run `install-mac.command` or manual sideload
- **Windows Desktop** — run `install-windows.bat` or manual sideload

Installer scripts are served from `/install-mac.command` and `/install-windows.bat` on the Cloud Run URL.

## Testing

```bash
pnpm test           # Vitest unit + logic tests
pnpm test:e2e       # Playwright e2e tests
```

## Environment variables

Copy `.env.example` → `.env`:

```
VITE_API_URL=https://elefant.legal/api/v1
VITE_GEMINI_BASE_URL=https://gateway.pydantic.dev/proxy/google
```

These are baked into the build at compile time via Vite's `import.meta.env`.
