# Contributing to the Elefant Word add-in

Thanks for helping. This file is the short version; `CLAUDE.md` and `docs/agents/working-with-the-fleet.md` hold the full process.

## Run it locally

Prerequisites: Node 22 and pnpm 10 (`packageManager` pins the version).

```sh
pnpm install --frozen-lockfile
pnpm certs              # once: trusted localhost HTTPS certs for Office
pnpm dev                # Vite dev server over HTTPS
```

Then sideload `manifest.xml` in Word; see `agent_docs/2026-03-04-manual-test-runbook.md`.

## Run the suites

```sh
pnpm build              # tsc -b && vite build (the typecheck)
pnpm test               # vitest, agent_tests/**
pnpm test:e2e           # playwright in a browser, not Word (UI changes)
```

CI is intentionally local-first: the GitHub Actions workflow exists but is not the merge gate. Run the suites on your own machine and quote the exact pass counts in the PR. Changes to `src/lib/office.ts`, `src/main.tsx` or a manifest also need a manual check inside Word.

## Pull requests

- Open or link an issue first; put `Refs #N` in the PR body.
- One concern per PR. [Conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:` ...).
- Tests are required for behaviour changes: behaviour-named, one concept each, clean output.
- Every source file opens with two `ABOUTME:` comment lines.
- No secrets in code, config or fixtures; `VITE_*` values are baked into the public bundle.
- Every PR goes through an adversarial review gate before merge: independent reviewers try to refute each claim the PR makes, and the suites are re-run on a fresh checkout. See [`agent_docs/2026-09-29-release-gate.md`](agent_docs/2026-09-29-release-gate.md).

By contributing you agree your contribution is licensed under the [Apache License 2.0](LICENSE).
