import { describe, it, expect } from 'vitest'
import type { LogEntry } from '../types'
import { entriesToCSV, entriesToJSON, fileStamp } from './export'

const sample: LogEntry[] = [
  { timestamp: '2026-06-27T10:00:00.000Z', messageType: 'error', processID: 9, processImagePath: '/usr/bin/foo', subsystem: 'com.apple.x', category: 'core', eventMessage: 'hello' },
]

describe('entriesToCSV', () => {
  it('starts with the header row', () => {
    const csv = entriesToCSV(sample)
    expect(csv.split('\n')[0]).toBe('timestamp,level,pid,process,subsystem,category,message')
  })
  it('writes the process basename and fields', () => {
    const row = entriesToCSV(sample).split('\n')[1]
    expect(row).toContain('error')
    expect(row).toContain('9')
    expect(row).toContain('foo')
    expect(row).toContain('hello')
  })
  it('escapes commas, quotes and newlines', () => {
    const csv = entriesToCSV([{ ...sample[0], eventMessage: 'a,b "c" \nd' }])
    const row = csv.split('\n').slice(1).join('\n')
    expect(row).toContain('"a,b ""c"" \nd"')
  })

  // Any process can write arbitrary text to the unified log, so an exported
  // message must never be evaluated as a formula by a spreadsheet app.
  it.each([
    ['=cmd|\'/c calc\'!A1', "'="],
    ['+1+1', "'+"],
    ['-2+3', "'-"],
    ['@SUM(A1:A9)', "'@"],
    ['\tSUM(A1)', "'\t"],
  ])('neutralises a leading formula character in %j', (message, expectedPrefix) => {
    const row = entriesToCSV([{ ...sample[0], eventMessage: message }]).split('\n')[1]
    const cell = row.slice(row.lastIndexOf(',') + 1).replace(/^"|"$/g, '')
    expect(cell.startsWith(expectedPrefix)).toBe(true)
  })

  it('leaves ordinary messages untouched', () => {
    const row = entriesToCSV([{ ...sample[0], eventMessage: 'connection invalid' }]).split('\n')[1]
    expect(row.endsWith('connection invalid')).toBe(true)
  })

  it('neutralises formulas in every column, not just the message', () => {
    const row = entriesToCSV([{ ...sample[0], subsystem: '=EVIL()', category: '@BAD' }]).split('\n')[1]
    expect(row).toContain("'=EVIL()")
    expect(row).toContain("'@BAD")
  })
})

describe('entriesToJSON', () => {
  it('round-trips to the same data', () => {
    expect(JSON.parse(entriesToJSON(sample))).toEqual(sample)
  })
})

describe('fileStamp', () => {
  it('produces a filesystem-safe YYYY-MM-DD_HH-MM-SS stamp', () => {
    expect(fileStamp(new Date(2026, 5, 27, 9, 5, 3))).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/)
  })
  it('is deterministic for the same date', () => {
    const d = new Date(2026, 5, 27, 9, 5, 3)
    expect(fileStamp(d)).toBe(fileStamp(d))
    expect(fileStamp(d)).toBe('2026-06-27_09-05-03')
  })
})
