import { getProcessName } from './stats'
import type { LogEntry } from '../types'

export type ExportFormat = 'csv' | 'json'

/** Build a filesystem-safe timestamp like 2026-06-27_14-05-09 for default filenames. */
export function fileStamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
}

/**
 * Neutralise spreadsheet formula injection (CWE-1236).
 *
 * Log messages are attacker-influenceable — any process can write arbitrary text
 * to the unified log — so a message beginning with =, +, - or @ would be treated
 * as a formula by Excel/Numbers/Sheets when the export is opened. Tab and CR are
 * included because Excel strips leading whitespace before parsing the cell.
 * Prefixing with an apostrophe forces the cell to be read as literal text.
 */
function neutralizeFormula(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
}

function csvCell(value: unknown): string {
  const s = neutralizeFormula(value == null ? '' : String(value))
  // Quote if the cell contains a comma, quote, or newline; double up embedded quotes.
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function entriesToCSV(entries: LogEntry[]): string {
  const header = ['timestamp', 'level', 'pid', 'process', 'subsystem', 'category', 'message']
  const rows = entries.map(e => [
    e.timestamp,
    e.messageType,
    e.processID,
    getProcessName(e),
    e.subsystem ?? '',
    e.category ?? '',
    e.eventMessage,
  ].map(csvCell).join(','))
  return [header.join(','), ...rows].join('\n')
}

export function entriesToJSON(entries: LogEntry[]): string {
  return JSON.stringify(entries, null, 2)
}

/** Fallback download for browser demo mode (no Electron save dialog). */
function browserDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Export the given entries as CSV or JSON. Uses Electron's native save dialog
 * when available, otherwise falls back to a browser download.
 * Returns the saved path (Electron), 'downloaded' (browser), or null if cancelled.
 */
export async function exportEntries(entries: LogEntry[], format: ExportFormat): Promise<string | null> {
  const content = format === 'csv' ? entriesToCSV(entries) : entriesToJSON(entries)
  const defaultName = `conlog_${fileStamp()}.${format}`
  const mime = format === 'csv' ? 'text/csv' : 'application/json'

  if (window.electronAPI?.exportData) {
    const res = await window.electronAPI.exportData({
      content,
      defaultName,
      filters: [{ name: format.toUpperCase(), extensions: [format] }],
    })
    return res.saved ? (res.path ?? 'saved') : null
  }

  browserDownload(content, defaultName, mime)
  return 'downloaded'
}

/**
 * Capture a PNG snapshot of the current window view (Electron only).
 * Returns the saved path, or null if unavailable/cancelled.
 */
export async function saveSnapshot(label: string): Promise<string | null> {
  if (!window.electronAPI?.captureSnapshot) return null
  const res = await window.electronAPI.captureSnapshot({
    defaultName: `conlog_${label}_${fileStamp()}.png`,
  })
  return res.saved ? (res.path ?? 'saved') : null
}
