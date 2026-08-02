# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-08-02

### Added

- Releases are now built by GitHub Actions and carry a signed build-provenance
  attestation, verifiable with
  `gh attestation verify <file> --repo hash00/ConLog`. This lets anyone confirm
  a downloaded artifact was built from this repository at a given commit, rather
  than trusting a maintainer's local build.

## [1.0.0] - 2026-06-27

First release.

### Added

- **Metrics dashboard** — error/fault rates, severity breakdown, timelines, top
  noisy processes, repeated-error patterns, and a sortable process summary.
- **Log Explorer** — virtualized Excel-like grid handling 15k+ rows, with regex
  search, per-column filters and cross-filtering, resizable/reorderable/hideable
  columns, persisted layout, saved presets, bookmarks, and error correlation.
- **Live Stream** — real-time `log stream` of errors and faults, batched in the
  main process, accumulating across tab switches, with fault alerts.
- **Process inspector** — multiple PIDs as tabs, live CPU/RAM sparklines, root
  and sandbox status, process tree view, Show in Finder / Copy path, and errors
  grouped by pattern.
- **Diagnostics** — built-in hints for common macOS errors, plus custom rules.
- **Export** — CSV, JSON, and PNG snapshots via a native save dialog.
- Light/dark theme following macOS appearance, keyboard shortcuts, and
  Activity Monitor-style process naming.
- Vitest unit tests for the pure utilities, ESLint, and GitHub Actions CI
  running lint, typecheck, and tests.

### Security

- No shell interpolation: subprocesses are spawned with argv arrays, never with
  command strings built from log or process fields.
- Content-Security-Policy, sandboxing, and navigation lockdown in the main
  process. The CSP permits no remote origins.
- Fonts are bundled rather than fetched from Google, so the app makes no network
  requests and works fully offline.

[Unreleased]: https://github.com/hash00/ConLog/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/hash00/ConLog/releases/tag/v1.0.1
[1.0.0]: https://github.com/hash00/ConLog/releases/tag/v1.0.0
