import { describe, it, expect } from 'vitest'
import type { LogEntry } from '../types'
import {
  appDisplayName, formatBytes, computeProcessStats, computeTimeline,
  normalizePattern, groupErrorsByPattern, computeErrorPatterns,
} from './stats'

function mk(p: Partial<LogEntry>): LogEntry {
  return {
    timestamp: '2026-06-27T10:00:00.000Z', messageType: 'default', processID: 1,
    eventMessage: '', ...p,
  }
}

describe('appDisplayName', () => {
  it('resolves an app extension to its owning .app (matches Activity Monitor)', () => {
    expect(appDisplayName('/System/Applications/Mail.app/Contents/PlugIns/MailShareExtension.appex/Contents/MacOS/MailShareExtension')).toBe('Mail')
  })
  it('uses the innermost .app for nested helpers (keeps them distinct)', () => {
    expect(appDisplayName('/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions/1/Helpers/Google Chrome Helper (Renderer).app/Contents/MacOS/Google Chrome Helper (Renderer)'))
      .toBe('Google Chrome Helper (Renderer)')
  })
  it('uses the bundle name for a normal app', () => {
    expect(appDisplayName('/System/Volumes/Preboot/Cryptexes/App/System/Applications/Safari.app/Contents/MacOS/Safari')).toBe('Safari')
  })
  it('falls back to the executable name when unbundled', () => {
    expect(appDisplayName('/usr/sbin/mDNSResponder')).toBe('mDNSResponder')
  })
  it('handles empty/undefined', () => {
    expect(appDisplayName('')).toBe('')
    expect(appDisplayName(undefined)).toBe('')
  })
})

describe('formatBytes', () => {
  it('formats KB, MB and GB', () => {
    expect(formatBytes(512)).toBe('512 KB')
    expect(formatBytes(2048)).toBe('2.0 MB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 GB')
  })
})

describe('computeProcessStats', () => {
  const entries = [
    mk({ processID: 0, processImagePath: '/kernel', messageType: 'error', userID: 0 }),
    mk({ processID: 0, processImagePath: '/kernel', messageType: 'fault', userID: 0 }),
    mk({ processID: 9, processImagePath: '/usr/bin/foo', messageType: 'error', userID: 501 }),
    mk({ processID: 9, processImagePath: '/usr/bin/foo', messageType: 'debug', userID: 501 }),
  ]
  it('counts by severity and flags root (uid 0)', () => {
    const stats = computeProcessStats(entries)
    const kernel = stats.find(s => s.pid === 0)!
    expect(kernel.errors).toBe(1)
    expect(kernel.faults).toBe(1)
    expect(kernel.total).toBe(2)
    expect(kernel.isRoot).toBe(true)
    const foo = stats.find(s => s.pid === 9)!
    expect(foo.isRoot).toBe(false)
    expect(foo.debug).toBe(1)
  })
  it('sorts by errors+faults descending', () => {
    expect(computeProcessStats(entries)[0].pid).toBe(0) // 2 err/fault > 1
  })
})

describe('computeTimeline', () => {
  it('orders buckets chronologically across midnight (not lexically by HH:mm)', () => {
    // 23:55 error then 00:05 (next day) fault — lexical HH:mm would invert these.
    const tl = computeTimeline([
      mk({ timestamp: '2026-06-27T23:55:00.000Z', messageType: 'error' }),
      mk({ timestamp: '2026-06-28T00:05:00.000Z', messageType: 'fault' }),
    ])
    expect(tl).toHaveLength(2)
    expect(tl[0].errors).toBe(1) // earlier bucket first
    expect(tl[0].faults).toBe(0)
    expect(tl[1].faults).toBe(1)
  })
  it('buckets coarsely for long spans (adaptive granularity)', () => {
    const tl = computeTimeline([
      mk({ timestamp: '2026-06-27T00:00:00.000Z' }),
      mk({ timestamp: '2026-06-27T23:00:00.000Z' }),
    ])
    // ~23h span -> hourly buckets -> two distinct buckets, not 1380 minute buckets.
    expect(tl.length).toBeLessThanOrEqual(24)
    expect(tl.length).toBeGreaterThanOrEqual(2)
  })
  it('returns [] for no entries', () => {
    expect(computeTimeline([])).toEqual([])
  })
})

describe('normalizePattern / error grouping', () => {
  it('collapses hex and long numbers', () => {
    expect(normalizePattern('failed at 0xdeadbeef pid 12345')).toBe('failed at 0x… pid N')
  })
  it('groups errors by pattern with counts and a sample', () => {
    const entries = [
      mk({ messageType: 'error', eventMessage: 'boom 0x1' }),
      mk({ messageType: 'error', eventMessage: 'boom 0x2' }),
      mk({ messageType: 'fault', eventMessage: 'other thing' }),
      mk({ messageType: 'debug', eventMessage: 'ignored' }),
    ]
    const groups = groupErrorsByPattern(entries)
    expect(groups[0].count).toBe(2) // the two "boom 0x…" collapse together
    expect(groups[0].sample.eventMessage).toBe('boom 0x1')
    expect(groups).toHaveLength(2) // debug excluded
    expect(computeErrorPatterns(entries)[0].count).toBe(2)
  })
})
