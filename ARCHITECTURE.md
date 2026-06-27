# Architecture

Orientation for anyone working on ConLog. Read this before your first change —
most of the surprises in this codebase are explained below.

## What it is

An Electron + React desktop app for macOS. It reads the unified system log
through Apple's native `log` CLI, correlates each entry's PID with live process
data from `ps` and `lsof`, and presents metrics, an Excel-like log explorer, a
live stream, and per-process diagnostics.

## Process split

Two processes, strictly separated. This boundary is the main thing to respect:

| | |
|---|---|
| `electron/main.ts` | The **only** place that shells out. Owns every `log` / `ps` / `lsof` / `codesign` invocation, the batched `log stream` subscription, export-to-disk, and PNG snapshot capture. Exposes all of it over IPC handlers. |
| `electron/preload.ts` | The sole bridge. Whitelists the IPC surface onto `window`. Nothing else crosses. |
| `src/` | Renderer. React 18 + Tailwind. Never touches Node APIs. |

If you need new system data, add an IPC handler in the main process and expose
it through the preload bridge. Do not reach for Node from the renderer.

### Demo mode

Open the renderer in a plain browser (`npm run dev`, then visit
http://localhost:5173 directly) and it falls back to **mock data**. Real logs
only exist inside the Electron window. This makes UI work possible without
constantly re-reading the system log, and it is why `window.electronAPI` is
always checked before use.

## Key modules

- `src/App.tsx` — tab/view routing and top-level state.
- `src/streamStore.ts` — accumulates live-stream events across tab switches.
- `src/utils/` — `stats.ts`, `diagnostics.ts`, `export.ts`. Pure functions, and
  the only code under test. **Put new logic here when it can be pure** — that is
  the cheapest way to make it testable.
- `src/components/LogTable.tsx` — virtualized grid via `@tanstack/react-virtual`,
  handles 15k+ rows. Do not replace virtualization with a plain `.map()`; the
  table will lock up on real data volumes.

## Data quirks worth knowing

- `log show --style ndjson` emits **one JSON object per line**. `--style json`
  emits a pretty-printed multi-line array that cannot be parsed line-by-line.
- macOS reports `messageType` **capitalized** (`Error`, `Fault`, `Default`).
  The renderer normalizes to lowercase on receipt, in `App.tsx` and
  `streamStore.ts`. Compare against lowercase in renderer code.
- `log` predicates are case-insensitive, so `messageType == "error"` and
  `== "Error"` behave identically.
- `log stream` has no `--level error`; errors and faults are selected with a
  predicate instead.
- Historical fetches are hard-capped at 15,000 entries with a 20s watchdog, to
  stop a wide time window from exhausting memory.

## Security constraints — do not regress

These were hardened deliberately. A change that weakens any of them will be
rejected in review:

- **No shell interpolation.** Spawn with an argv array. Never build a command
  string from a log field, process name, or anything else user-influenced.
  There is no `shell: true` in this codebase and there should never be.
- **Absolute binary paths.** `log`, `ps`, `lsof` and `codesign` are invoked via
  the `BIN` map in `electron/main.ts`, not resolved through `PATH`.
- **CSP, sandbox, and navigation lockdown** are set in `electron/main.ts`. The
  CSP permits **no remote origins** — fonts are bundled, and the app makes no
  network requests at all. Keep it that way.
- **CSV exports neutralize formulas.** Any process can write arbitrary text to
  the unified log, so exported cells beginning with `=`, `+`, `-` or `@` are
  prefixed with an apostrophe. See `neutralizeFormula` in `src/utils/export.ts`.
- **Electron stays on a supported major** (currently 42.x).

## Packaging

`npm run build` runs `tsc`, `vite build`, then `electron-builder` into
`release/`. The `afterPack` hook in `build/afterPack.cjs` strips extended
attributes, ad-hoc signs the bundle, and verifies the signature — failing the
build rather than shipping a broken one.

That hook exists for a specific reason. Apple Silicon requires every binary to
carry at least an ad-hoc signature, but `codesign` refuses to sign any bundle
carrying extended attributes. iCloud Drive attaches `com.apple.FinderInfo` to
files as they are written, so **building inside a synced `Documents` or
`Desktop` folder silently produces an .app with no `Contents/_CodeSignature`**.
It runs on the machine that built it and reports "damaged" everywhere else —
and removing the quarantine attribute does not fix it. Clone to a non-synced
path.

Releases are ad-hoc signed but **not notarized**; there is no Apple Developer
ID for this project. Downloaded copies are therefore blocked by Gatekeeper
until the user allows them in System Settings.

## Conventions

- TypeScript strict. Shared shapes live in `src/types.ts`.
- Tailwind utility classes, merged with `clsx` + `tailwind-merge`. Theme tokens
  are in `tailwind.config.js`. **Every view must work in light and dark.**
- Charts are Recharts and must recolor with the theme.
- Tests are Vitest + jsdom, colocated as `*.test.ts(x)` beside the source.
