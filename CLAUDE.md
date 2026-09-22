# CLAUDE.md

Repo-level instructions for humans and AI coding agents working on the Elefant Word add-in (`elegantelefant/word`). The owner's global `~/.claude/CLAUDE.md` applies everywhere; this file holds only what you learn by working here. The process in full: `docs/agents/working-with-the-fleet.md`.

## What this is

A Microsoft Word task-pane add-in: a small React SPA that Word loads through Office.js. Two tiers — free BYOK (the user's Gemini key; review runs in the browser via `@google/adk`) and paid (signed-in Elefant accounts; async jobs on `elefant.legal/api/v1`). Static files served by nginx on Cloud Run (`elefant-word`, `us-central1`). Narrative onboarding (`agent_docs/2026-07-20-intern-onboarding.md`) exists only untracked on the laptop — committing it is a follow-up; `agent_docs/2026-03-10-ux-fixes-and-cicd.md` is the issue list the recent PRs work from.

| Path | What |
|---|---|
| `src/main.tsx`, `src/App.tsx` | Entry (mounts after `Office.onReady`), shell + tab routing |
| `src/lib/office.ts` | The only Word boundary: selection, body, insert |
| `src/lib/agent.ts`, `src/lib/models.ts` | Free-tier ADK agent + Zod output schema; the one Gemini model list |
| `src/api/*.ts` | Paid-tier HTTP clients; `client.ts` adds auth, maps 401/429 |
| `src/lib/polling.ts`, `src/hooks/useJob.ts` | Paid work is a job: create → `poll_url` → `completed`/`failed` |
| `src/components/`, `src/store/`, `src/hooks/` | React UI, React Context state (no state library), hooks |
| `src/types/api.ts` | Backend contract types, hand-derived from the vendored `openapi.json` (elefant-api 0.1.0) |
| `agent_tests/` | Vitest (jsdom) — the suite CI runs; `setup.ts` + the `@google/adk` shim alias |
| `e2e/` | Playwright against the Vite dev server on `https://localhost:3001` — a browser, not Word |
| `manifest.xml` / `manifest.prod.xml` | Sideload manifests: localhost vs Cloud Run |
| `nginx.conf`, `Dockerfile`, `cloudbuild.yaml` | Serving + deploy; the Cloud Build trigger is not connected |
| `agent_docs/` | Date-versioned plans, runbooks, reviews; newest wins |

## Commands (from `package.json`; nothing else exists)

```sh
pnpm install --frozen-lockfile   # pnpm@10.20.0 (packageManager pin); Node 22 in CI
pnpm dev                         # Vite on https://localhost:3000 — run `pnpm certs` once first
pnpm build                       # tsc -b && vite build — this is the typecheck
pnpm test                        # vitest run → agent_tests/**/*.test.{ts,tsx}
pnpm test:e2e                    # playwright test — starts its own server on :3001, needs the certs
pnpm run deploy                  # build + docker buildx + gcloud run deploy — owner-gated
```

There is no lint script: no ESLint, no Prettier. Until one is added the reviewer is the linter (#6 shipped a conditional return above `useState`, which the `react-hooks` rule would have caught).

## Merge gate

GitHub Actions (`.github/workflows/test.yml`: vitest + tsc/vite build) is billing-gated and currently runs zero steps. It is never the blocker and never the evidence. The gate is the full local suite on the exact merged tree:

```sh
git fetch origin refs/pull/<N>/merge && git checkout -q FETCH_HEAD
pnpm install --frozen-lockfile && pnpm build && pnpm test
```

Both green, real tallies quoted in the verdict (`Tests 169 passed (169)`). Add `pnpm test:e2e` when the PR touches `App.tsx`, `main.tsx`, `Layout.tsx` or a panel. Nothing here runs inside real Word: a change to `lib/office.ts`, `main.tsx` or a manifest also needs a human sideload and a screenshot — `agent_docs/2026-03-04-manual-test-runbook.md`.

Not yet in place: a `scripts/premerge-check.sh` that runs the block above on the merge ref, and ESLint with `react-hooks`. Until they exist the verifier runs the commands by hand and says so in the verdict.

## Issues, branches, PRs, verdicts

- Work is a GitHub issue in this repo (`gh issue …`). Linear mirrors them as `ELE-nnn`; the GitHub issue is the record agents read and write.
- Owner rulings live in the issue body under `## OWNER DECISION <date>`, verbatim. They are not re-litigated.
- The five triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) do not exist here yet — only GitHub's defaults. Creating them is the first follow-up; until then name the role in the issue.
- Branch `codex/<issue>-<slug>` for lanes; humans may keep `feat/`, `fix/` but the issue number is in the branch or the first body line. PR to `main`. Body says `Refs #N`, never `Fixes`/`Closes` — merged ≠ deployed ≠ verified.
- PR body: tick-box progress, WIRE PROOF (the named test that proves the change through the production path, with counts), a mutation ledger for every test added, local evidence at the pushed head SHA. Template in `docs/agents/working-with-the-fleet.md`.
- Every PR gets one independent adversarial verification comment ending `Verdict: MERGE @<head sha>` or `Verdict: HOLD @<head sha>: …`. A self-posted "recommend merge" is a self-check, not a verdict. Merge only on MERGE.
- ARBITER RULE, TWO-WRITERS RULE, closure on the deployed build: `docs/agents/working-with-the-fleet.md`.

## Increments and naming

- Ship the smallest slice that leaves the repo better; follow-ups are follow-ups — file the issue, link it, do not fold it in (rumble#24 died carrying two changes).
- UI increments match the existing look: the ~350×700 task pane, the Tailwind 4 classes and `components/` already in use. No new design system, no new dependency for a UI slice.
- A UIUX issue closes only with a screenshot of the deployed add-in — inside Word for pane changes, the Cloud Run URL for the landing page.
- Every source file opens with two `ABOUTME:` lines. Names say what, never how or when (no `New*`, `Legacy*`, `*Wrapper`).
- Conventional commits, one concern each; `git commit -- <paths>`, never `git add .`.

## Who does what

| | Humans (interns, devs) | Fleet (Codex/Claude lanes, Claude supervising) |
|---|---|---|
| Picks | `ready-for-human`, anything assigned, anything found while reading | `ready-for-agent`, priority order, one lane per issue |
| Files issues | yes — what you find while reading is an issue first, a PR second | yes — verifier findings become issues |
| Opens PRs | same shape as the fleet's; run the gate locally before asking for review | same |
| Verifies | may run Claude/Codex review locally and post the notes; the verdict comes from the fleet | posts the verdict on every PR, human or agent |
| Pushes to a branch | only their own | only their own — never a human's |
| Runs in Word, takes screenshots | yes — the part only a human can do | no |
| Merges, deploys | no | supervisor merges on MERGE; deploy stays owner-gated |

## Asking the owner (owner-gated protocol)

Owner-gated = only the owner can do it: money, prod/IAM/credentials (Cloud Run deploy, the Cloud Build trigger, the GCP project), privacy defaults (#10: BYOK keys transit `gateway.pydantic.dev`), product and design taste, contract ownership (#9). Everything else: decide, state the decision in the PR, ship; a reviewer can overturn.

When you do need him: one comment on the issue under `## OWNER QUESTIONS <date>`, numbered, each with the question, your recommendation, what it blocks, and the default you will take if there is no answer by a stated date. Batch — one such comment per issue per day. Slack carries a one-line pointer to it, never the question itself. Whoever receives the answer pastes it verbatim into the issue body under `## OWNER DECISION <date>` in the same turn. Never re-ask a decided question; never "raise it with Ian" out of band and leave the issue silent (rumble#17: "raised with Ian rather than addressed here" — nothing on the issue).

## Standing rules that bite in this stack

- Tests: behaviour-named, one concept each, pristine output. Assert the visible effect (the toast copy, the rendered link), not that a mock was or wasn't called — #6 was a runtime no-op because its test scoped out the very decision it was named for. Never mock the code under test. `import.meta.env.DEV` is `true` under Vitest, so a DEV-gated branch never runs in a test: extract the decision into a function and test that (#6's `lib/mount-decision.ts`).
- Rules of hooks: no early return above a hook. Decide in `main.tsx`, not in `App`.
- Office.js: `index.html` loads office.js from the CDN unconditionally, so in a browser `typeof Office` is defined and `Office.onReady` still fires, with `host: null`. Branch on `info.host`, never on `typeof Office`.
- Consolidating a value: grep the literal, not the symbol (#8: the third copy of the default model hid behind a local `const`).
- Secrets env-only (`VITE_*` are baked in at build time); nothing in git, nothing in chat. The user's Gemini key lives in their `localStorage` — never log it.
- Legal facts (citations, section numbers, dates, in-force status) come from the corpus through the API, never from the model. `lib/agent.ts` must not be prompted to invent authorities.
- Magic numbers become named constants; no speculative try/catch; comments say what or why, never what changed.
- Machine: one shared laptop. Work in your own clone or worktree under the session scratchpad — never in `/Users/ianc/python/ele23/v4/word_plugin` (its `main` is diverged with uncommitted edits). `vitest --maxWorkers=3`, `playwright --workers=1`.

## Landmines

- The Cloud Run URL is public; a browser visitor gets the task pane until #6 lands the landing page.
- `determineTier` maps `trial` → `free`; gate "sign in" banners on the token, not the tier, and on `!loading` (#4).
- `AUTH_INITIAL` is spread across six test files; a `makeAuth(overrides)` helper is the agreed follow-up (#4).
- `openapi.json` here is elefant-api 0.1.0; birepo is at 0.207.0 with a camelCase wire. `src/types/api.ts` is hand-maintained — regenerating is a contract decision (#9), not a chore.
- `word_plugin-contract` beside the laptop checkout is a stale worktree on the closed PR #1 branch. Ignore it.
