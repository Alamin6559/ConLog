import type { DiagnosticHint, LogEntry } from '../types'

// #23 User-defined rules: match (substring, case-insensitive) -> hint. Persisted
// in localStorage and editable in Settings. Loaded lazily, refreshed on save.
export interface CustomRule { match: string; title: string; description: string; severity: 'high' | 'medium' | 'low' }
const CR_KEY = 'conlog-custom-rules-v1'
let customRules: CustomRule[] | null = null
export function getCustomRules(): CustomRule[] {
  if (customRules === null) { try { const r = localStorage.getItem(CR_KEY); customRules = r ? JSON.parse(r) as CustomRule[] : [] } catch { customRules = [] } }
  return customRules
}
export function setCustomRules(rules: CustomRule[]): void {
  customRules = rules
  try { localStorage.setItem(CR_KEY, JSON.stringify(rules)) } catch { /* ignore */ }
}

export function getDiagnosticHints(entry: LogEntry): DiagnosticHint[] {
  const msg = (entry.eventMessage || '').toLowerCase()
  const proc = (entry.processImagePath || '').toLowerCase()
  const hints: DiagnosticHint[] = []

  // User rules take priority — surfaced before the built-in pattern matches.
  for (const r of getCustomRules()) {
    if (r.match && msg.includes(r.match.toLowerCase())) hints.push({ title: r.title, description: r.description, severity: r.severity })
  }

  if (msg.includes('out of memory') || msg.includes('memory pressure') || msg.includes('malloc') || msg.includes('oom'))
    hints.push({ title: 'Memory pressure', description: 'Open Activity Monitor → Memory. Sort by Memory to find the top consumers. Consider quitting unused apps or adding RAM.', severity: 'high' })

  if (msg.includes('crash') || msg.includes('sigsegv') || msg.includes('sigabrt') || msg.includes('killed'))
    hints.push({ title: 'Process crash', description: 'Check ~/Library/Logs/DiagnosticReports for a .crash file. Reinstall the app or check for updates if recurring.', severity: 'high' })

  if (msg.includes('no space') || msg.includes('disk full') || msg.includes('enospc') || msg.includes('i/o error'))
    hints.push({ title: 'Disk space / I/O error', description: 'Run `df -h` in Terminal. Use Apple menu → About This Mac → Storage to free space.', severity: 'high' })

  if (msg.includes('timed out') || msg.includes('connection refused') || msg.includes('network unreachable'))
    hints.push({ title: 'Network / timeout', description: 'Check System Settings → Network. Try `ping 8.8.8.8`. If app-specific, verify the service is running.', severity: 'medium' })

  if (msg.includes('permission denied') || msg.includes('eperm') || msg.includes('sandbox') || msg.includes('deny(1)'))
    hints.push({ title: 'Sandbox / permission denial', description: 'Check System Settings → Privacy & Security. The process may need Full Disk Access or another entitlement.', severity: 'medium' })

  if (msg.includes('kernel') || msg.includes('panic') || msg.includes('gpu fault') || msg.includes('gpu hang'))
    hints.push({ title: 'Kernel / GPU fault', description: 'Check /Library/Logs/DiagnosticReports for kernel panic logs. Run Apple Diagnostics (hold D at startup) if recurring.', severity: 'high' })

  if (msg.includes('invalid window') || msg.includes('cgxpackages'))
    hints.push({ title: 'WindowServer constraint error', description: 'A window tried to apply constraints before it was fully initialised. Usually benign — triggered when apps open/resize rapidly. If constant, the app may have a layout bug.', severity: 'low' })

  if (msg.includes('continuity') || msg.includes('cmcontinuity') || msg.includes('no valid device'))
    hints.push({ title: 'Continuity Camera not found', description: 'macOS is looking for a nearby iPhone to use as a webcam (Continuity Camera) but can\'t find one. Harmless if you don\'t use this feature. Ensure both devices are on the same Apple ID and Wi-Fi to resolve.', severity: 'low' })

  if (msg.includes('no current verdict') || proc.includes('socketfilterfw'))
    hints.push({ title: 'Firewall flow tracking', description: 'The macOS Application Firewall or a tool like Little Snitch lost track of a network connection\'s verdict. Normal during rapid connection turnover. Review firewall rules if blocking issues appear.', severity: 'low' })

  if (msg.includes('simulating crash'))
    hints.push({ title: 'Intentional Apple telemetry crash', description: 'ContextStoreAgent "simulates" crashes deliberately as part of Apple\'s on-device intelligence diagnostics. Not a real crash — safe to ignore.', severity: 'low' })

  if (msg.includes('beacon') || msg.includes('searchparty'))
    hints.push({ title: 'Find My / AirTag background service', description: 'searchpartyd manages AirTag and Find My device tracking. "No BeaconStoreActor" is a transient startup race condition. Persists occasionally on older macOS — update to latest macOS if frequent.', severity: 'low' })

  if (msg.includes('auth timeout') || msg.includes('getcaccessorycaps') || msg.includes('mfaauthentication'))
    hints.push({ title: 'Accessory authentication failure', description: 'A connected USB/Lightning accessory failed the MFi authentication handshake. Try a different cable or port. Third-party accessories without Apple certification will fail this check.', severity: 'medium' })

  if (msg.includes('unable to serialize') || msg.includes('cfnull') || proc.includes('linearmouse'))
    hints.push({ title: 'LinearMouse serialization error', description: 'LinearMouse is failing to serialize a config object containing a null value. Check for a LinearMouse update — this is a known bug in older versions. Settings → LinearMouse → Check for Updates.', severity: 'low' })

  if (msg.includes('iosurface') || msg.includes('sid: 0x0') || msg.includes('fClientTask'))
    hints.push({ title: 'IOSurface graphics buffer error', description: 'A graphics surface was referenced after it was already freed. Usually caused by rapid window creation/destruction (e.g. window animations, Electron apps). Harmless unless accompanied by visual glitches.', severity: 'low' })

  if (msg.includes('tcc') || msg.includes('tccaccessrequest') || msg.includes('entitlement'))
    hints.push({ title: 'TCC permission check', description: 'An app requested a privacy permission (Accessibility, Camera, etc.) without the required system entitlement. The request will be blocked. Check System Settings → Privacy & Security to grant access manually if needed.', severity: 'medium' })

  if (msg.includes('time machine') || msg.includes('backupd') || msg.includes('connection invalid'))
    hints.push({ title: 'Time Machine / backup issue', description: 'The Time Machine backup service lost its XPC connection. Usually self-recovering. If backups are failing, open System Settings → General → Time Machine and check the backup status.', severity: 'medium' })

  if (hints.length === 0)
    hints.push({ title: 'General error', description: 'No specific pattern matched. Search the message text online or in Apple\'s developer forums. Check if the process has recent updates.', severity: 'low' })

  return hints
}
