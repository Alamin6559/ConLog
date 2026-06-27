import { format, parseISO } from 'date-fns'
import type { LogEntry, ProcessStats, TimelineBucket, SubsystemStats } from '../types'

/**
 * Activity Monitor-style display name from an executable path:
 * - app extensions (.appex) → the owning .app ("Mail" for a Mail share extension)
 * - other bundled executables → the innermost .app ("Google Chrome Helper (Renderer)")
 * - unbundled binaries → the executable filename
 */
export function appDisplayName(path?: string): string {
  if (!path) return ''
  const exe = path.split('/').pop() || path
  if (path.includes('.appex/')) {
    const owner = path.match(/\/([^/]+)\.app\//) // outermost .app = owning app
    if (owner) return owner[1]
  }
  const apps = [...path.matchAll(/\/([^/]+)\.app\//g)]
  if (apps.length) return apps[apps.length - 1][1] // innermost .app bundle
  return exe
}

export function getProcessName(entry: LogEntry): string {
  return appDisplayName(entry.processImagePath) || `PID ${entry.processID}`
}

export function computeProcessStats(entries: LogEntry[]): ProcessStats[] {
  const map = new Map<string, ProcessStats>()
  for (const entry of entries) {
    const name = getProcessName(entry)
    const key = `${name}::${entry.processID}`
    const s = map.get(key) ?? { name, pid: entry.processID, errors: 0, faults: 0, debug: 0, info: 0, total: 0, path: entry.processImagePath, isRoot: false }
    s.total++
    if (entry.userID === 0) s.isRoot = true
    if (entry.messageType === 'error') s.errors++
    else if (entry.messageType === 'fault') s.faults++
    else if (entry.messageType === 'debug') s.debug++
    else s.info++
    map.set(key, s)
  }
  return Array.from(map.values()).sort((a, b) => (b.errors + b.faults) - (a.errors + a.faults))
}

export function computeTimeline(entries: LogEntry[]): TimelineBucket[] {
  // Parse once; key buckets by epoch time so they sort chronologically (fixes the
  // midnight wrap where "00:10" < "23:50" lexically). Bucket size adapts to the
  // span so a 24h window doesn't produce 1440 one-minute buckets.
  const times: number[] = new Array(entries.length)
  let min = Infinity, max = -Infinity
  for (let i = 0; i < entries.length; i++) {
    const t = Date.parse(entries[i].timestamp)
    times[i] = t
    if (!Number.isNaN(t)) { if (t < min) min = t; if (t > max) max = t }
  }
  if (!Number.isFinite(min)) return []
  const spanMin = (max - min) / 60000
  const bucketMs = spanMin <= 10 ? 60_000 : spanMin <= 120 ? 5 * 60_000 : spanMin <= 720 ? 30 * 60_000 : 3_600_000
  const crossesDay = spanMin > 720 || new Date(min).getDate() !== new Date(max).getDate()
  const fmt = crossesDay ? 'MM-dd HH:mm' : 'HH:mm'

  const buckets = new Map<number, TimelineBucket>()
  for (let i = 0; i < entries.length; i++) {
    const t = times[i]
    if (Number.isNaN(t)) continue
    const start = Math.floor(t / bucketMs) * bucketMs
    let b = buckets.get(start)
    if (!b) { b = { time: format(start, fmt), errors: 0, faults: 0, debug: 0, info: 0, total: 0 }; buckets.set(start, b) }
    b.total++
    const mt = entries[i].messageType
    if (mt === 'error') b.errors++
    else if (mt === 'fault') b.faults++
    else if (mt === 'debug') b.debug++
    else b.info++
  }
  return Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]).map(([, b]) => b)
}

export function computeSubsystemStats(entries: LogEntry[]): SubsystemStats[] {
  const map = new Map<string, SubsystemStats>()
  for (const entry of entries) {
    const name = entry.subsystem || '(no subsystem)'
    const s = map.get(name) ?? { name, errors: 0, faults: 0, total: 0 }
    s.total++
    if (entry.messageType === 'error') s.errors++
    else if (entry.messageType === 'fault') s.faults++
    map.set(name, s)
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 20)
}

/** Collapse hex addresses, PIDs and numbers so similar messages share one pattern. */
export function normalizePattern(message: string): string {
  return (message || '')
    .replace(/0x[0-9a-fA-F]+/g, '0x…')
    .replace(/\b\d{4,}\b/g, 'N')
    .replace(/\b\d+\.\d+\b/g, 'N.N')
    .slice(0, 120)
}

/** Group a process's errors/faults by normalized pattern, keeping a sample entry. */
export function groupErrorsByPattern(entries: LogEntry[]): { pattern: string; count: number; sample: LogEntry }[] {
  const map = new Map<string, { count: number; sample: LogEntry }>()
  for (const entry of entries) {
    if (entry.messageType !== 'error' && entry.messageType !== 'fault') continue
    const key = normalizePattern(entry.eventMessage)
    const g = map.get(key)
    if (g) g.count++
    else map.set(key, { count: 1, sample: entry })
  }
  return Array.from(map.entries()).map(([pattern, g]) => ({ pattern, ...g })).sort((a, b) => b.count - a.count)
}

export function computeErrorPatterns(entries: LogEntry[]) {
  const map = new Map<string, number>()
  for (const entry of entries) {
    if (entry.messageType !== 'error' && entry.messageType !== 'fault') continue
    const pattern = normalizePattern(entry.eventMessage)
    map.set(pattern, (map.get(pattern) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
}

export function computeHourlyHeatmap(entries: LogEntry[]) {
  // 24 buckets × 7 days
  const matrix: Record<string, number> = {}
  for (const entry of entries) {
    try {
      const d = parseISO(entry.timestamp)
      const hour = d.getHours()
      const day = d.getDay() // 0 = Sun
      const key = `${day}-${hour}`
      matrix[key] = (matrix[key] ?? 0) + 1
    } catch { /* skip */ }
  }
  return matrix
}

export function severityBg(level: string): string {
  switch (level) {
    case 'fault': return 'bg-fault/10 text-fault border-fault/20'
    case 'error': return 'bg-error/10 text-error border-error/20'
    case 'debug': return 'bg-debug/10 text-debug border-debug/20'
    default: return 'bg-accent/10 text-accent border-accent/20'
  }
}

export function severityColor(level: string): string {
  switch (level) {
    case 'fault': return '#ff6b9d'
    case 'error': return '#ff4d6a'
    case 'debug': return '#7c8db0'
    default: return '#4d9eff'
  }
}

export function formatBytes(kb: number): string {
  if (kb > 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} GB`
  if (kb > 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb} KB`
}
