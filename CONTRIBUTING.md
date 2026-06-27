# Contributing to ConLog

Contributions are welcome — bug reports, fixes, features, docs, and design work
all help. This guide covers what you need to get productive quickly.

## Requirements

- **macOS.** ConLog reads Apple's unified log, so it cannot meaningfully run or
  be tested anywhere else. The renderer's demo mode works on any platform, which
  is enough for pure UI work.
- **Node.js 22.12 or newer.** `electron-builder` requires it.

## Getting started

```bash
git clone https://github.com/hash00/ConLog.git
cd ConLog
npm install
npm run dev        # Vite dev server + the Electron window
```

Opening http://localhost:5173 in a normal browser gives you **demo mode** with
mock data — handy for UI work without repeatedly reading the system log. Real
logs only appear in the Electron window.

## Before you open a pull request

Run all three. CI enforces them and will fail the PR otherwise:

```bash
npm run lint
npm run typecheck
npm test
```

To check a packaged build:

```bash
npm run build      # → release/
```

## How to contribute

**Found a bug?** Open an issue with the version of macOS, what you did, and what
happened. A screenshot helps for anything visual. Please don't paste raw log
output without reading it first — it can contain paths, usernames, and tokens
from your own machine.

**Want to add a feature?** Open an issue describing the idea before writing
much code. It's a small project with a deliberate scope, and it's better to
agree on the shape of something than to have work rejected after the fact.

**Small fixes** — typos, obvious bugs, doc improvements — just send the PR.

## Working on the code

Read [ARCHITECTURE.md](ARCHITECTURE.md) first. The important points:

- The main process is the only place that shells out. The renderer never
  touches Node APIs.
- The **security constraints** section is not negotiable. Changes that
  introduce shell interpolation, weaken the CSP, add a network request, or
  disable the sandbox will not be merged.
- Put logic in `src/utils/` as pure functions where you can. That's where the
  tests live and it's the easiest code to review.

## Pull request expectations

- Keep it focused. One concern per PR reviews far faster than a mixed bag.
- Add tests for anything with logic in it. The pure utilities have good
  coverage and it's worth keeping.
- Write a commit message that explains **why**, not just what. The diff already
  says what changed.
- Every view must work in **both light and dark** themes. Check both.

## Reporting security issues

Please don't open a public issue for a security problem. See
[SECURITY.md](SECURITY.md).

## Code of conduct

Participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
