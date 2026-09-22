# word — cloud API call-site inventory vs. contract 0.305.0

Program plan item **W0** (sub-project 1, Stage 1). Read-only static analysis; no working
tree was modified.

**Sources**
- word: `git show origin/main:<path>` @ `9ef62ee` (branch `main`, repo
  `/Users/ianc/python/ele23/v4/word_plugin`)
- Contract: `git show origin/main:openapi.json` @ `714be5d` (branch `main`, repo
  `/Users/ianc/multilang/elefant/ivory`), version **0.305.0**, 291 paths, 628 schemas.
  Byte-identical (sha256 `18955e35…`) to word's own vendored `openapi.json` at the same
  origin/main commit — the two repos' copies are in sync, so the "stale vendor spec"
  problem described in word issues #9/#15/#19 no longer applies to *this* comparison
  (it was open against an older 0.1.0/0.207.0 mismatch, since resolved by word commits
  `b3d7ef6`/`8ec2838`).
- word base URL: `API_URL = import.meta.env.VITE_API_URL || "https://elefant.legal/api/v4"`
  (`src/api/client.ts:4`). Every row below is called as `${API_URL}${path}`, i.e.
  `https://elefant.legal/api/v4<path>`.

**Legend**
- **RENAMED-PATH**: every single row carries this, systemically — the contract moved
  every operation under `/api/v1/*` (unversioned in the old surface, now version-bumped
  and namespaced); word still targets `/api/v4/<path>` with no `/api/v1` segment at all.
  This is documented in ivory's own plan (`agent_docs/2026-09-22-credible-delightful-
  local-first-plan.md`, item **W0**: *"client is on `elefant.legal/api/v4` with
  unversioned paths; the 0.305.0 contract is `/api/v1/*`"*) — this inventory is that
  plan item. Per-row verdicts below add SHAPE-DRIFT / NO-CONTRACT-MATCH on top where
  the field/path also diverges beyond the prefix.
- "Dead code" = defined in `src/api/*.ts` but not imported/invoked from any panel or
  hook on `origin/main` (verified by `git grep`) — still a distinct call the frontend
  *would* make, so it's listed, but it cannot be reached from the current UI.

## Call sites

| # | File:line | Method + path as called | Request fields sent | Response fields actually read | Contract op (0.305.0) | Verdict |
|---|---|---|---|---|---|---|
| 1 | `src/api/auth.ts:30` | Browser/Office-dialog navigation (not `fetch`) to `GET https://elefant.legal/api/v4/auth/login?redirect=office-addin` | — (query param `redirect` only) | none via `fetch`; dialog listens for a `postMessage`/`DialogMessageReceived` payload `{token}` from whatever page loads | none — **no `/auth/*` path exists anywhere in the 291-path spec.** BetterAuth issues tokens outside the versioned API surface (confirmed: no auth endpoints, `POST /users` is a stub returning 501 "Users are created via BetterAuth") | **NO-CONTRACT-MATCH.** This is word issue **#7** ("Sign-in flow 404s") — confirmed live in probes.md: `GET /api/v4/me` etc. return 401 (endpoint exists) but the login sub-path itself is not part of any documented API. |
| 2 | `src/api/account.ts:8` (called from `src/hooks/useAuth.ts:28`) | `GET https://elefant.legal/api/v4/me` | none (Bearer token only; optional `X-Org-Id` header not sent) | `user.name`, `org.name` (`SettingsPanel.tsx`); `org.account_type` (`useAuth.ts:9` `determineTier()`) | `GET /api/v1/me` — `operationId: me` | **RENAMED-PATH + SHAPE-DRIFT.** Contract's org object is `MeOrg{id,name,slug,accountType,briefcaseLabel}` — camelCase `accountType`, not `account_type`. `determineTier()` reads `me.org.account_type` → always `undefined` → falls through to `"paid"`. **Every signed-in user, free or paid, is treated as paid tier.** |
| 3 | `src/api/account.ts:12` | `GET https://elefant.legal/api/v4/whoami` — **dead code**, no call site (`whoami()` is exported, never imported) | none | n/a (unreachable) | none — **no `/whoami` path exists in the 0.305.0 spec at all** | **NO-CONTRACT-MATCH** (and unreachable from the UI today, so latent only). |
| 4 | `src/api/review.ts:41` (called from `ReviewPanel.tsx:59`) | `POST https://elefant.legal/api/v4/review` | `text`, `instructions`, `context` (`context` sub-keys `jurisdiction`/`document_type`/`playbook_id`/`risk_tolerance` — these *do* match the contract's documented freeform `context` keys) | `job.job_id` → passed to `pollForResult` | `POST /api/v1/review` — `operationId: review` | **RENAMED-PATH + SHAPE-DRIFT.** Response schema `JobCreatedResponse` is `{jobId, status, pollUrl}` (camelCase, `additionalProperties:false`). Word reads `job.job_id`, which does not exist → `undefined` → the very next call polls `GET /jobs/undefined`. **The paid Review flow is broken end-to-end after job creation**, not just at result-rendering. |
| 5 | `src/api/review.ts:54` (called from `FullAnalysisPanel.tsx:52` via `runFullAnalysis`) | `POST https://elefant.legal/api/v4/review` | `text` only | `job.job_id` (same as #4) | `POST /api/v1/review` — `operationId: review` | **RENAMED-PATH + SHAPE-DRIFT** — identical `jobId`/`job_id` break as #4. |
| 6 | `src/api/review.ts:55` (same caller as #5) | `POST https://elefant.legal/api/v4/research` | `{ query: "Analyze the following legal text and identify all legal risks, obligations, and key terms:\n\n<text>" }` | `job.job_id` | `POST /api/v1/research` — `operationId: research` | **SHAPE-DRIFT (critical).** `ResearchRequest` requires `question` (`required: ["question"]`, `additionalProperties: false`). Word sends `query`, not `question` — the required field is absent and the sent field is an unrecognized extra property under a strict schema. **This request is expected to fail validation (422)** before the `jobId` drift even matters; `.catch(() => null)` in `runFullAnalysis` swallows this silently, so Full Analysis quietly loses its research half. |
| 7 | `src/lib/polling.ts:19` (inside `pollForResult`, reached from #4/#5/#6) | `GET https://elefant.legal/api/v4/jobs/{jobId}` | — | `job.status`, `job.error` | `GET /api/v1/jobs/{job_id}` — `operationId: get_job_status` | **RENAMED-PATH** only for the fields actually read here — `status`/`error` are spelled identically in `JobResponse`, so no additional shape drift for *this* read set. (In practice `{jobId}` is already `undefined` per #4–#6, so this call 404s/422s regardless of the path prefix.) |
| 8 | `src/lib/polling.ts:22` (same caller) | `GET https://elefant.legal/api/v4/jobs/{jobId}/result` | — | `result.result` cast to `ReviewResponse` → `.summary`, `.issues[].message/.kind/.location/.suggestion` (`ReviewPanel.tsx` `IssueCard`) | `GET /api/v1/jobs/{job_id}/result` — `operationId: get_job_result` | **RENAMED-PATH + SHAPE-DRIFT (critical).** Envelope `{id,status,result}` matches. But the review payload inside `result` is `ReviewResult{jobType,summary,perspective,issues,...}` whose `issues` are `ReviewIssueResult{category,severity,recommendation,clauseReference,sourceFilename,description,explanation}` — **no `message`, `kind`, `location`, or `suggestion` field exists anywhere in that schema.** `summary` matches; every issue-level field word reads and renders does not. This independently confirms word issue **#15**'s finding, verified directly against this contract rather than secondhand. |
| 9 | `src/api/jobs.ts:16` (called from `HistoryPanel.tsx:51`) | `GET https://elefant.legal/api/v4/jobs?status=&type=` | query params `status`, `type` (names match contract) | `res.jobs` (array); per item: `job.type`, `job.status`, `job.created_at`, `job.query` | `GET /api/v1/jobs` — `operationId: list_jobs` | **RENAMED-PATH + SHAPE-DRIFT.** `{jobs:[...], nextCursor}` wrapper matches. Each item is `JobResponse` — `createdAt`, not `created_at`. Activity feed dates render as invalid/blank. `type`, `status`, `query` all match by name. |
| 10 | `src/api/jobs.ts:21` | `GET https://elefant.legal/api/v4/jobs/{jobId}/result` — **dead code**, no call site (`getJobResult()` exported, never imported) | — | n/a (unreachable) | `GET /api/v1/jobs/{job_id}/result` — `operationId: get_job_result` | **RENAMED-PATH** (same target as #8, but this particular wrapper function is never called — `pollForResult` in `lib/polling.ts` duplicates it inline). |
| 11 | `src/api/clauses.ts:30` (called from `ClausesPanel.tsx:31`) | `GET https://elefant.legal/api/v4/clause-databases` | — | `res.databases`; per item: `db.name`, `db.id`, `db.clause_count` | `GET /api/v1/clause-databases` — `operationId: list_clause_databases` | **RENAMED-PATH + SHAPE-DRIFT.** `databases` wrapper and `id`/`name` match. `ClauseDatabaseResponse.clauseCount` (camelCase) vs. word's `clause_count` — the dropdown option `"{name} ({count})"` always shows `(0)`. |
| 12 | `src/api/clauses.ts:35` (called from `ClausesPanel.tsx:43`) | `GET https://elefant.legal/api/v4/clause-databases/{databaseId}/clauses` | path param only; optional `category` query param defined by the contract is never sent (word issue #19) | `res.clauses`; per item: `clause.id`, `.name`, `.content`, `.category` | `GET /api/v1/clause-databases/{database_id}/clauses` — `operationId: list_clauses` | **RENAMED-PATH only** for the fields read — `id`/`name`/`content`/`category` all match `ClauseResponse` verbatim (its `createdAt`/`tags`/`metadata` exist but are never read by the panel, so not a drift *in practice*). |
| 13 | `src/api/clauses.ts:44` | `POST https://elefant.legal/api/v4/clause-databases/{databaseId}/suggest` — **dead code**, no call site (word issue #19: "suggestClause has no call sites") | `{ context }` (matches required `context` field) | n/a (unreachable); typed as `Clause[]` | `POST /api/v1/clause-databases/{database_id}/suggest` — `operationId: suggest_clause` | **RENAMED-PATH + SHAPE-DRIFT.** Response is `{suggestions: ClauseSuggestion[], totalCandidates}`, and each item is `ClauseSuggestion{clauseId,name,content,similarity,relevance,recommended}` — no `id` (it's `clauseId`), no `category`/`tags`. If this were ever wired up as typed (`Clause[]`), `key={clause.id}` would be `undefined` for every row. |
| 14 | `src/api/mammoth.ts:42` (called from `MammothPanel.tsx:129`) | `POST https://elefant.legal/api/v4/legal-requests` | `{ request_type, title, description, priority }` | none (caller only checks success, discards the returned object) | `POST /api/v1/legal-requests` — `operationId: create_legal_request` | **SHAPE-DRIFT (critical).** `LegalRequestCreateRequest` requires `{requestType, title}` with `additionalProperties: false`. Word sends `request_type`, not `requestType` — required field missing, sent field rejected as unknown. **Every "Create Request" submission in the Mammoth panel is expected to fail (422)** against this contract. |
| 15 | `src/api/mammoth.ts:55` (called from `MammothPanel.tsx:58`) | `GET https://elefant.legal/api/v4/legal-requests` | none sent (optional `status` param supported, not used) | `res.requests`; per item: `.title`, `.status`, `.request_type`, `.priority`, `.description`, `.result` (existence check) | `GET /api/v1/legal-requests` — `operationId: list_legal_requests` | **RENAMED-PATH + SHAPE-DRIFT.** `requests` wrapper, `title`/`status`/`priority`/`description`/`result` all match `LegalRequestResponse`. `requestType` (camelCase) vs. word's `.request_type` — every row in the Requests list renders a blank request-type badge. |
| 16 | `src/api/mammoth.ts:63` | `GET https://elefant.legal/api/v4/legal-requests/{requestId}` — **dead code**, no call site (`getLegalRequest()` exported, never imported) | — | n/a (unreachable) | `GET /api/v1/legal-requests/{request_id}` — `operationId: get_legal_request` | **RENAMED-PATH + SHAPE-DRIFT** — same `requestType`/`createdAt`/`updatedAt` drift as #15/#14 would apply if reached. |
| 17 | `src/api/mammoth.ts:70` | `POST https://elefant.legal/api/v4/legal-requests/{requestId}/execute` — **dead code**, no call site (`executeLegalRequest()` exported, never imported) | — | n/a; declared return type `{job_id, status}` | `POST /api/v1/legal-requests/{request_id}/execute` — `operationId: execute_legal_request` | **RENAMED-PATH + SHAPE-DRIFT** — actual response is `LegalRequestExecuteResponse{id,status,jobId,pollUrl}`; word's own declared return type already disagrees with that (`job_id` vs `jobId`), same class of bug as #4, just never invoked. |

## Verdict counts

| Verdict | Count | Rows |
|---|---|---|
| NO-CONTRACT-MATCH | 2 | #1 (auth/login), #3 (whoami) |
| SHAPE-DRIFT (critical — breaks the request/response, not just a cosmetic field) | 6 | #2 (tier detection), #4/#5 (jobId), #6 (query vs question), #8 (issue fields), #14 (requestType) |
| RENAMED-PATH + SHAPE-DRIFT (non-critical field, e.g. a count or timestamp not otherwise blocking) | 6 | #9, #11, #13, #15, #16, #17 |
| RENAMED-PATH only (fields actually read all match) | 2 | #7, #12 |
| RENAMED-PATH only, dead code | 1 | #10 |
| MATCHES | 0 | — |

17 distinct call sites (12 reachable from the current UI, 5 defined but never invoked
from any panel/hook — #3, #10, #13, #16, #17). Every single row carries the systemic
`/api/v4` → `/api/v1` base-prefix problem; **zero rows are a clean MATCH** against the
0.305.0 contract.

## Out of scope (checked, not cloud API calls)

- `src/lib/agent.ts` / `src/lib/adk-shim.ts` (free-tier ADK-JS + BYOK Gemini path,
  `ReviewPanel.tsx`'s `reviewFree`) — calls Google's Gemini API directly, never
  `elefant.legal`. Confirmed via `git grep`.
- `src/lib/office.ts`, `src/hooks/useDocument.ts` — Office.js only, no network calls.
