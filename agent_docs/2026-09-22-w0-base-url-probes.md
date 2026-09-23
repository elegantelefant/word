# Production base URL probes (no auth, no payload)

Goal: determine the correct base+prefix for the word migration (part of W0) without
credentials. All requests below are bare, unauthenticated `GET`s with no body, no
tokens, no document content, no personal data — 9 requests across a 3 base × 3 path
grid, plus 3 header-inspection re-requests of paths already probed (12 requests total
against elefant infrastructure; well short of a load-bearing volume, and every path was
already in the original candidate list — no new endpoints were touched to get them).

Candidate bases (per the task) × representative paths:

| Base | `/me` | `/review` | `/jobs` |
|---|---|---|---|
| `https://elefant.legal/api/v4` (word's current `API_URL`) | **401** | **401** | **401** |
| `https://elefant.legal/api/v1` (contract prefix, same host) | **404** | **404** | **404** |
| `https://api.elefant.com/api/v1` (contract prefix, ivory's `DEFAULT_CLOUD_URL`) | **TLS handshake failure** | **TLS handshake failure** | **TLS handshake failure** |

Raw commands (repeated for all 9 combinations):
```
curl -sS -m 10 -o /dev/null -w "%{http_code}" "<base><path>"
```

## Reading each result

**`elefant.legal/api/v4/*` → 401.** Per the task's rule (401/403/405 ⇒ endpoint exists
behind auth), this surface is alive and auth-gated — consistent with word issue #7,
which found `/api/v4/me` et al. functioning while only `/auth/login` 404s. This is
word's *current* base, and it still works at the transport level today.

**`elefant.legal/api/v1/*` → 404, but not an API 404.** Headers for the two paths were
pulled in full (`curl -D -`) to check whether this is a real "route not registered"
response or a generic catch-all:

- `/api/v4/me`: `HTTP/2 401`, `content-length: 365`, single `set-cookie: GAESA=...`
  (App Engine session affinity cookie only).
- `/api/v1/me`: `HTTP/2 404`, `content-length: 218`, **four** `set-cookie` headers
  including `i18n_redirected=en`, `isKnnSearch=true`, `isFuzzySearch=false` — these are
  front-end web-app cookies (search UI state, locale), not API cookies.

Both hit the same origin (`server: cloudflare`, `via: 1.1 google`, same
`x-cloud-trace-context` App-Engine backend), so this isn't a different deployment — it's
the same app. The extra frontend cookies on the `/api/v1` response indicate the request
fell through to the **marketing/app SPA's catch-all route**, not a "path not found"
response from an API router. In other words: `/api/v1` is not registered as an API
prefix on `elefant.legal` at all today.

**`api.elefant.com/api/v1/*` → TLS handshake failure, before any HTTP request is
possible.** DNS resolves (4 A records, no AAAA, AWS `18.173.x.x` range). TCP connects.
The server sends `alert(40) handshake_failure` immediately after ClientHello, with no
certificate ever presented (`openssl s_client` confirms: `no peer certificate
available`). General HTTPS egress from this environment is confirmed working
(`google.com`/`anthropic.com` both return 200 over the same connection path), so this
is not a local network restriction — `api.elefant.com` itself has no working HTTPS
listener answering right now for a generic client hello. That's consistent with a load
balancer that exists at the network layer but has no TLS/SNI certificate bound yet
(pre-launch), not with a wrong hostname (it does resolve) or a firewall block (TCP
connects fine).

## Corroborating internal evidence (ivory repo, not part of the live-probe budget)

- `src-tauri/src/lib.rs:22`: `DEFAULT_CLOUD_URL = "https://api.elefant.com"` — this is
  the domain the Tauri desktop app is *coded* to treat as the cloud backend.
- `agent_docs/2026-09-22-credible-delightful-local-first-plan.md`, item **W0**: *"client
  is on `elefant.legal/api/v4` with unversioned paths; the 0.305.0 contract is
  `/api/v1/*`. Base URL + prefix + a drift CI ... = word #9, sequenced before the
  staging smoke"* — i.e. this exact migration is already planned and not yet done.
- The routing fix that teaches ivory's own Rust proxy to recognize `/api/v1/*` as
  cloud-bound (commit `42cd530`, "route /api/v1 paths to cloud after 0.4.0 prefix
  migration") exists only on `origin/chore/contract-refresh-0.4.0` — **it is not on
  `origin/main`.** `origin/main`'s `lib.rs` still carries the old, stale
  `CLOUD_ONLY_PREFIXES` list of *unversioned* paths (`/billing`, `/auth`, `/me`,
  `/clause-databases`, ...), which is bug #7 in that same plan doc's "bugs surfaced"
  list. So even ivory's own desktop client — on `main` — is not yet routing `/api/v1`
  correctly to `api.elefant.com` either.

## Conclusion: ambiguous — the migration target is not yet live to probe

Every live signal points the same way, but none of them is a green light to cut word
over today:

1. The **only base that currently answers real API responses** is
   `elefant.legal/api/v4` — word's existing, pre-migration base. It's auth-gated (401)
   and functioning, except for the known-broken `/auth/login` sub-path (#7).
2. The **contract's actual prefix, `/api/v1`, is not reachable anywhere public right
   now**: absent on `elefant.legal` (falls through to the website's SPA 404, not an API
   404), and the domain that's coded as its intended home,`api.elefant.com`, has no
   live TLS endpoint to even attempt a request against.
3. Internal docs confirm this is a known, in-progress gap (W0 itself, plus ivory's
   parallel and also-unmerged `/api/v1` routing fix) rather than a probing mistake on
   my part.

**Recommendation:** do not point word at any new base yet. The 0.305.0 contract's
`/api/v1` surface has no confirmed public home — `elefant.legal/api/v1` doesn't route
and `api.elefant.com` doesn't currently terminate TLS. Whoever owns backend deploy needs
to confirm (a) whether `/api/v1` is meant to land on `elefant.legal` (same host, new
prefix) or on `api.elefant.com` (new host), and (b) when `api.elefant.com`'s TLS
listener goes live — before word's W0 migration can target anything concretely. Until
then, word's only working base remains `elefant.legal/api/v4`, which the field-level
findings in `2026-09-22-w0-callsite-inventory.md` show is itself badly out of sync with the 0.305.0 shapes on
several endpoints already in production use.

## Addendum (2026-09-22, after consulting the birepo session)

The ambiguity above is resolved — and the earlier conclusion is superseded. There is
no public host for bare `/api/v1` and none is planned without an owner decision
(birepo ALB plan §6). Clients reach the backend through the Nuxt BFF catch-all proxy:
`https://elefant.legal/api/v4/[...path]` strips `/api/v4` and forwards verbatim, and
the backend mounts everything under `/api/v1` — so the correct client URL shape is
`https://elefant.legal/api/v4/api/v1/<path>` (double prefix, by design per
frontend/apps/nuxt/app/api/custom-fetch.ts). Verified live: `/api/v4/api/v1/me` and
`/api/v4/api/v1/jobs` both return 401 (exists, auth-gated). `api.elefant.legal`'s
uniform 403 is Cloud Run IAM (service-to-service only, custom-audience ID tokens) —
deliberately not public; `api.elefant.com` appears in no config. Staging:
`https://staging.elefant.legal`, same shape.

Open question moved to #7: the proxy authenticates via BetterAuth session cookie or a
narrowly-allowlisted `x-api-key`; whether the add-in's Bearer JWT (e.g. from
`GET /api/auth/stream-token`) passes remains for the staging smoke to verify.
