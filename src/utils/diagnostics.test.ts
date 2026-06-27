import { describe, it, expect, beforeEach } from 'vitest'
import type { LogEntry } from '../types'
import { getDiagnosticHints, setCustomRules } from './diagnostics'

function mk(eventMessage: string): LogEntry {
  return { timestamp: '2026-06-27T10:00:00.000Z', messageType: 'error', processID: 1, eventMessage }
}

describe('getDiagnosticHints', () => {
  beforeEach(() => setCustomRules([])) // reset user rules between tests

  it('matches a built-in pattern (memory pressure → high)', () => {
    const hints = getDiagnosticHints(mk('app hit memory pressure and was killed'))
    expect(hints.some(h => /memory/i.test(h.title) && h.severity === 'high')).toBe(true)
  })

  it('always returns at least one hint (general fallback)', () => {
    expect(getDiagnosticHints(mk('totally unrecognised gibberish xyzzy')).length).toBeGreaterThan(0)
  })

  it('surfaces a matching custom rule first', () => {
    setCustomRules([{ match: 'widgetd', title: 'Our widget bug', description: 'Restart the widget service', severity: 'medium' }])
    const hints = getDiagnosticHints(mk('com.acme.widgetd connection failed'))
    expect(hints[0].title).toBe('Our widget bug')
    expect(hints[0].severity).toBe('medium')
  })

  it('ignores a custom rule that does not match', () => {
    setCustomRules([{ match: 'nevermatchthis', title: 'X', description: 'Y', severity: 'low' }])
    expect(getDiagnosticHints(mk('something else')).every(h => h.title !== 'X')).toBe(true)
  })
})
