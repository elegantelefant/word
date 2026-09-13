# Working with the fleet

How work moves through `elegantelefant/word` when the owner, an autonomous coding fleet (Codex/Claude lanes supervised by a Claude session) and human developers share it. Same rules as the monorepo's `docs/agents/burndown.md`; the commands are this repo's. `CLAUDE.md` is the summary, this is the reference.

## Roles

| Role | Does | Never |
|---|---|---|
| Owner | money, prod, credentials, privacy, product and design rulings — recorded verbatim in the issue body under `## OWNER DECISION <date>` | reads a diff to learn what a PR does; the verdict tells him |
| Supervisor (one Claude session) | labels, lane launches, every merge (only on MERGE), closure passes, the daily digest | verifies inline; pushes to a lane's or a human's branch |
| Implementer (human or lane) | own branch, behaviour-named tests, the PR, answers to HOLDs | pushes to anyone else's branch; posts its own verdict |
| Verifier (opus / Sol tier) | fresh checkout of the merge ref, the full gate, the mutation ledger, defect injection, the verdict comment | trusts the PR body; re-verifies an unchanged head |
| Closure judge | verifies the closure criterion on the deployed build, then closes | closes on "merged" |

## Issue lifecycle

1. **Filed** as a GitHub issue: title = the behaviour, body = what the user sees, how to reproduce, acceptance criteria. Humans file what they find while reading; a PR without an issue gets one first. Linear mirrors issues as `ELE-nnn`; GitHub is the record.
2. **Triaged**: `needs-triage` → one of `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix` (labels still to be created here — the supervisor applies them with a one-line evidence comment; the owner disposes).
3. **Claimed**: a `claimed: <who> <date>` comment before starting. One issue, one lane or one person.
4. **Briefed** (anything beyond a one-file fix): an `## AGENT BRIEF` comment pinned to an `origin/main` SHA — root cause, files, exact change, tests, closure criterion, ≤ 25 lines. A brief is evidence, not authority: trust it exactly as far as its pin holds (`git diff --stat <sha>..origin/main -- <files>`).
5. **Owner questions** batched under `## OWNER QUESTIONS <date>`; answers recorded under `## OWNER DECISION <date>` (protocol below).
6. PR → verdict → merge → deploy → closure judge → close. Nothing closes on merge.

## Branches and PRs

- `codex/<issue>-<slug>` for lanes. Humans may keep `feat/`, `fix/` prefixes; the issue number is in the branch name or the first line of the body.
- Rebase onto `origin/main` before asking for a verdict. Never `git stash`, never `-X ours/theirs`, never `--no-verify`.
- `Refs #N`, never `Fixes #N` / `Closes #N`.
- Body template:

```md
## What / Why
Refs #N. One paragraph each.

## Progress
- [x] slice 1: …
- [ ] follow-up: … (filed as #M)

## WIRE PROOF
`agent_tests/<file>.test.tsx › <test name>` proves the change through the production path
(the real entry point: `Office.onReady` → `main.tsx` → the component / `api/client.ts` → the job poll),
not through a mock of it. `pnpm test` → N passed (N); `pnpm build` clean.

## Mutation ledger
| test | mutation that makes it fail (`file:line → change`) | run |
|---|---|---|

## Local evidence
Commands run and their tallies, on the pushed head <sha>.
```

- Every "addressed" comment names the pushed head SHA and quotes the remote's tallies. Work described but not pushed cost a full review cycle on #4 (5 Sep comment, 7 Sep discovery). The verifier reads only the remote.
- One PR, one concern. Two unrelated changes in one file are two PRs.

## Verdicts

One independent adversarial verification per head SHA, posted as a PR comment. It:

- checks out `refs/pull/<N>/merge` fresh and runs the full gate with real counts;
- runs every mutation-ledger entry — a test that survives its mutation is a TEST-GAP; a new test without an entry is a TEST-GAP;
- injects the defect the PR claims to fix and shows the new test catches it;
- reads the three-dot diff for scope; the issue's `AGENT BRIEF` and `OWNER DECISION` outrank an earlier verdict;
- ends with exactly one of
  - `Verdict: MERGE @<head sha>`
  - `Verdict: HOLD @<head sha>: <blockers> (DEFECT n · TEST-GAP n · PROTOCOL n · OUT-OF-BRIEF n)`

Blocker classes: **DEFECT** = reproduced wrong behaviour; **TEST-GAP** = an untested claim or a surviving mutation; **PROTOCOL** = bookkeeping only (ledger, ABOUTME, formatting) → a cheap round, never counted as a fix round; **OUT-OF-BRIEF** = something the brief did not ask for → listed under *Follow-ups*, never a HOLD. Cosmetic nits and speculative risks are caveats inside a MERGE. Fix rounds are capped at three; the third HOLD goes to the owner with the residual blockers. A human's "Reviewed — recommend merge" on their own PR is a welcome self-check, not a verdict.

## Merge gate

The gate is the full local suite on the exact merged tree — GitHub's `refs/pull/<N>/merge`, never the PR head, never GitHub Actions (billing-gated; a check there, green or red, is neither evidence nor a blocker).

```sh
git fetch origin refs/pull/<N>/merge && git checkout -q FETCH_HEAD
pnpm install --frozen-lockfile && pnpm build && pnpm test
pnpm test:e2e            # when App.tsx, main.tsx, Layout.tsx or a panel changed
```

- **ARBITER RULE**: before MERGE, run every existing test file that imports the touched modules. The whole vitest suite takes seconds — run all of it. The rule matters for what vitest cannot reach: `lib/office.ts`, `main.tsx` or a manifest changed ⇒ the manual runbook in Word (`agent_docs/2026-03-04-manual-test-runbook.md`) with a screenshot; a panel changed ⇒ Playwright.
- **TWO-WRITERS RULE**: one pusher per branch. A reviewer who wants a change comments; the author pushes. Handing a branch over is an explicit comment ("handing this branch to <x>") after which the previous author stops.
- A failing test is never deleted or skipped; it is raised on the PR.
- Merge = squash on MERGE by the supervisor or the owner, quoting the gate tallies for that merge SHA.

Not yet in place: `scripts/premerge-check.sh` (the block above, one command), ESLint with `react-hooks`, the five triage labels. Until then the verifier runs the block by hand and quotes it.

## Deploy and closure

- Deploy is `pnpm run deploy` (or the unconnected `cloudbuild.yaml`): a Cloud Run revision of `elefant-word`. It needs `gcloud` auth and Artifact Registry access — owner-gated. The supervisor lists banked merges; the owner promotes.
- Deploy truth is the serving revision (`gcloud run services describe elefant-word --region us-central1`), never "merged".
- The closure judge verifies the issue's closure criterion on the deployed build: code at the deployed SHA, `curl` of the service URL / `manifest.xml`, and for anything user-visible a screenshot — inside Word for pane changes (a human takes it), the Cloud Run URL for the landing page. VERIFIED closes; REJECTED says exactly what is missing and becomes the next round.

## Owner-gated protocol

**Owner-gated** = only the owner can do it: money, prod / IAM / credentials, privacy defaults, product and design rulings, contract ownership, anything legal-content. Everything else is decided by whoever holds the issue, stated in the PR, and shippable — a reviewer can overturn it. Questions are not authorisation to stop.

1. One comment on the issue under `## OWNER QUESTIONS <date>`, numbered. Each item: the question in one line, the options, **your recommendation**, what it blocks, and the default you take if unanswered by `<date>`.
2. Batch: at most one such comment per issue per day. Slack gets a one-line pointer to the comment, never the question.
3. The owner answers (on the issue or in Slack). Whoever receives it pastes the answer **verbatim** into the issue body under `## OWNER DECISION <date>` in the same turn, with the Slack permalink if it came from there.
4. A decision is a ruling: lanes and humans do not re-litigate it; a verifier that disagrees says so in the verdict instead of re-imposing the withdrawn instruction.
5. Surface owner-gated items as such in PR bodies and digests: "OWNER-GATED: Cloud Build trigger — see #9". Never quietly wait on one.

Examples here: connecting the Cloud Build trigger (IAM); the Gemini proxy default (#10); regenerating `src/types/api.ts` against 0.207.0 (#9); any change to what free-tier users can do.

## No perfectionism

The bar is merge-ready and leaves the repo better. Follow-ups are follow-ups: file the issue, link it, ship the slice. One clarifying re-read, then act. A HOLD needs a concrete, reproducible blocker.

## Never

- prod actions (deploy, IAM, DNS, secrets) from a lane or a PR — owner-gated;
- secrets on disk or in chat — env only;
- legal facts from model memory — corpus or a lookup, or say "unverified";
- `Fixes #N` / `Closes #N`;
- two pushers on one branch;
- a verdict or an "addressed" comment without the head SHA;
- `pnpm install` in the laptop checkout; work in your own clone under the session scratchpad.
