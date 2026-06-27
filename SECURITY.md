# Security Policy

## Supported versions

ConLog is developed on the `main` branch and fixes land in the next release.
Only the latest release is supported.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Use GitHub's private vulnerability reporting instead:
[Report a vulnerability](https://github.com/hash00/ConLog/security/advisories/new).
That keeps the details private until a fix is available.

Please include what an attacker could achieve, the steps to reproduce it, and
the ConLog and macOS versions you tested on. You'll get an initial response
within a week.

## Scope

ConLog runs locally, reads the macOS unified log, and makes no network
requests. The interesting attack surface is therefore:

- **Subprocess invocation** — anything that could turn log or process data into
  executed commands.
- **The IPC boundary** — the main process handlers in `electron/main.ts` and
  what the preload bridge exposes.
- **Export handling** — content written to CSV, JSON, or PNG that could be
  dangerous when opened elsewhere.
- **Electron configuration** — CSP, sandboxing, and navigation restrictions.

### Already-known, deliberate design decisions

These are not vulnerabilities, so please don't report them as such:

- **Exports contain your raw log data.** CSV and JSON exports include full
  messages, process paths, and subsystems, which may contain usernames, home
  paths, or tokens. That's what an export is for. Review before sharing.
- **A user-supplied regex can freeze the UI.** The Log Explorer accepts an
  arbitrary regex. A catastrophically backtracking pattern will hang the window
  until you quit. It affects only the user who typed it.
- **Release builds are unsigned.** ConLog has no Apple Developer ID, so macOS
  Gatekeeper will warn on first launch.

## What ConLog does not do

It sends nothing anywhere. No telemetry, no crash reporting, no update check,
no analytics. The Content-Security-Policy permits no remote origins and fonts
are bundled rather than fetched. If you ever observe ConLog making a network
connection, that is a bug worth reporting.
