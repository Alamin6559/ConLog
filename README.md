# ConLog

[![CI](https://github.com/hash00/ConLog/actions/workflows/ci.yml/badge.svg)](https://github.com/hash00/ConLog/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A macOS Console log viewer with an easy UI. ConLog reads the system log via the
native `log` command, links each log entry's **PID to its live process** (CPU,
memory, open files, command line) for deeper insight, visualises everything with
**Recharts** graphs, lets you **export the data and save snapshots**, and offers
**diagnostic hints** that explain common errors and how to act on them.

## Features

- **Metrics dashboard** — headline error-rate and fault-rate (over all messages),
  severity breakdown, timelines, top noisy processes, and repeated-error patterns.
  The **Process summary** table is the centerpiece: sortable columns, a Run-as
  (root/user) flag, and click/double-click a PID to inspect it.
- **Log Explorer** — virtualized table (handles 15k+ rows smoothly) with Console-style
  columns (Time, Type, PID, Process, Library, Subsystem, Category, Thread, Activity,
  Message), **sortable headers**, **word-wrap toggle**, horizontal scroll, and search.
- **Live Stream** — real-time `log stream` of errors & faults (or all messages),
  batched in the main process; keeps running and accumulating across tab switches.
- **Process inspector** — open **multiple PIDs as tabs** to compare. Each shows live
  CPU/RAM/RSS/VSZ/state (with plain-English explanations), root & sandbox status,
  **Show in Finder** / **Copy path**, errors **grouped by pattern**, and diagnostics.
- **Light / dark theme** — follows your macOS appearance, with a manual toggle that
  persists. Charts recolor with the theme.
- **Export & snapshots** — save loaded logs as **CSV** or **JSON**, or capture a
  **PNG snapshot** of the current view, via a native save dialog.
- **Diagnostics** — built-in hints map common macOS errors (memory pressure,
  crashes, sandbox/TCC denials, Continuity, Time Machine, etc.) to next steps.

ConLog reads the **same unified logging system as Console.app** (via the `log` CLI).
Performance: the log table is virtualized and the live stream is batched in the
Electron main process, so large volumes don't freeze or crash the UI.

## Tech stack

React 18 · TypeScript · Vite 6 · Electron 42 · Tailwind CSS · Recharts · date-fns

## Requirements

macOS, and Node.js **22.12 or newer** (electron-builder requires it).

## Develop

```bash
npm install
npm run dev        # starts Vite + launches the Electron window
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest
```

The renderer runs at http://localhost:5173. Opened in a normal browser it shows
**mock data** (demo mode); the real macOS logs are only available in the Electron
window, which shells out to the `log`, `ps`, and `lsof` tools.

## Build a distributable

```bash
npm run build    # tsc + vite build + electron-builder → release/
```

## How export works

Data export (CSV/JSON) and PNG snapshots are handled in the Electron main process
([electron/main.ts](electron/main.ts)) via `export-data` and `capture-snapshot`
IPC handlers, exposed to the renderer in [electron/preload.ts](electron/preload.ts)
and driven from the **Export** menu in the header
([src/components/ExportMenu.tsx](src/components/ExportMenu.tsx)). Serialization
lives in [src/utils/export.ts](src/utils/export.ts).

## Privacy

ConLog reads the local unified log through Apple's own `log` CLI. Your log data,
process details, and exports never leave the machine — there is no telemetry and
no upload path of any kind.

The app makes **no network requests at all**. Fonts are bundled rather than
fetched from Google, and the packaged build's Content-Security-Policy permits no
remote origins, so ConLog works entirely offline.

## Install

### Build it yourself (recommended)

An app you compiled yourself is never quarantined, so there is no Gatekeeper
prompt and nothing to bypass. You also get to read what you're running.

```bash
git clone https://github.com/hash00/ConLog.git
cd ConLog
npm install
npm run build        # → release/ConLog-<version>-arm64.dmg
```

Needs macOS and Node.js 22.12+. Open the `.dmg` and drag ConLog to
Applications, or run the `.app` straight out of `release/mac-arm64/`.

> **Don't build inside iCloud Drive.** If your `Documents` or `Desktop` folder
> syncs to iCloud, the sync daemon attaches extended attributes to files mid-build
> and code signing fails, producing an app macOS calls "damaged". Clone to a
> non-synced path such as `~/src` instead.

### Download a release

Prebuilt `.dmg` files are on the
[Releases](https://github.com/hash00/ConLog/releases) page.

These builds are **ad-hoc signed but not notarized** — ConLog has no Apple
Developer ID. macOS will refuse to open a downloaded copy until you allow it
explicitly:

1. Open the `.dmg` and drag ConLog to Applications.
2. Try to launch it. macOS will block it.
3. Go to **System Settings → Privacy & Security**, scroll to the Security
   section, and click **Open Anyway** next to the ConLog message.
4. Launch again and confirm.

You only do this once.

> Right-clicking the app and choosing **Open** no longer works — Apple removed
> that shortcut in macOS 15. The Privacy & Security route above is the only way.

If you prefer the terminal, this does the same thing in one step:

```bash
xattr -dr com.apple.quarantine /Applications/ConLog.app
```

Only run that on software you actually trust — it is the same command that
would silently defeat Gatekeeper for something malicious. If you'd rather not,
build from source instead; that path involves no bypass at all.

## Contributing

Contributions are very welcome — bug reports, fixes, features, docs, and design
work all help.

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — setup, workflow, and what's expected
  in a pull request
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — how the app fits together, the data
  quirks that will surprise you, and the security constraints
- **[SECURITY.md](SECURITY.md)** — reporting a vulnerability privately
- **[Code of Conduct](CODE_OF_CONDUCT.md)**

Good places to start:

| Area | Ideas |
|---|---|
| **Diagnostics** | The hint rules in `src/utils/diagnostics.ts` map macOS errors to plain-English explanations. Adding rules needs no Electron knowledge — just a log message you've seen and understand. |
| **Privacy-safe export** | An optional redaction pass over exports, stripping usernames, home paths, emails, and tokens before writing CSV/JSON. |
| **Tests** | The pure utilities in `src/utils/` are covered; the components aren't. |
| **Performance** | The Log Explorer handles 15k rows. Larger windows still get capped. |
| **Distribution** | Code signing and notarization, so users don't have to bypass Gatekeeper. |

Not sure where to start? Open an issue and ask.

## License

[MIT](LICENSE) © hash00
