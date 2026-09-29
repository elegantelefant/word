# Release gate

Owner directive, 2026-09-29. CI is not running, so this gate plus local suites are the only verification a change gets before merge.

## Scope

Every fix or closure PR. That includes docs and spec PRs whose claims describe Office host behaviour, the backend contract or what the add-in does to a user's document. Nothing merges until it is green on both workflows.

## Workflow 1: adversarial

- List the PR's material claims: what it says it fixes, closes, guarantees or documents.
- Give each material claim N independent refuters (usually 2 to 4 per PR, scaled to risk). Each refuter works alone and tries to prove the claim false.
- A refutation needs evidence: a `file:line` citation, a failing command with its output, a reproduction, or a primary-source URL (learn.microsoft.com, the vendored `openapi.json`, an upstream issue). Opinion does not count.
- If a majority of refuters refute a claim, the claim is killed. A killed claim means the PR needs a fix.

## Workflow 2: dynamic release-readiness

- **Fresh-worktree suites.** Check out the PR head in a clean worktree and run `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`, plus the contract-drift check if the branch has one. Report exact pass/fail/skip counts, compared against `origin/main`.
- **Claims-vs-code audit.** Trace every user-facing claim in the diff to the code that implements it: UI copy, README, manifests and PR-referenced docs. A claim with no backing code is a finding.
- **Copy honesty.** User-facing copy must not promise behaviour the code does not deliver (for example "tracked" when the edit is untracked, or a tier the backend does not serve).
- **Docs move with claims.** If a change alters a documented behaviour, the doc is updated in the same PR.
- **Docs or spec PRs.** Check internal consistency, and confirm every integration point the doc names exists at the cited location.

## Actor model

- Sub-supervisors run both workflows and report a verdict for each PR: `release-ready` or `needs-fix`, listing only the findings that survived. They never merge.
- The top-level session decides and merges only when both workflows are green.

## Honesty rules

- Verify claims against the branch, never against the PR body.
- Every finding cites `file:line`, a URL, or a command with its output.
- Report exact counts. "Tests pass" on its own is not a result.
- If something is unverified, say so. Do not infer it.
