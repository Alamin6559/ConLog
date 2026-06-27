import { useSyncExternalStore } from 'react'
import type { LogEntry } from './types'

export type StreamLevel = 'errors' | 'all'
const MAX = 5000

export interface StreamSnapshot {
  entries: LogEntry[]
  streaming: boolean
  paused: boolean
  level: StreamLevel
  received: number
  alertOnFault: boolean
  alertKeyword: string
}

const ALERT_KEY = 'conlog-stream-alerts-v1'
function loadAlerts(): { alertOnFault: boolean; alertKeyword: string } {
  try { const r = localStorage.getItem(ALERT_KEY); if (r) { const o = JSON.parse(r); return { alertOnFault: !!o.alertOnFault, alertKeyword: o.alertKeyword || '' } } } catch { /* ignore */ }
  return { alertOnFault: false, alertKeyword: '' }
}

/**
 * Module-level singleton so the live stream keeps accumulating across view switches
 * (React components unmount when you change tabs, but this store does not).
 */
let snapshot: StreamSnapshot = { entries: [], streaming: false, paused: false, level: 'errors', received: 0, ...loadAlerts() }
let buffer: LogEntry[] = []
const listeners = new Set<() => void>()
let unsubscribeIpc: (() => void) | null = null
let flushQueued = false
let lastNotify = 0

// #19 Fire a throttled native notification (web Notification API works in Electron).
function maybeNotify(title: string, body: string) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const now = Date.now()
    if (now - lastNotify < 4000) return
    lastNotify = now
    new Notification(title, { body: body.slice(0, 140) })
  } catch { /* ignore */ }
}

function emit() {
  // Publish a fresh array (once per flush) so React memos keyed on `entries`
  // recompute — buffer itself is mutated in place between flushes.
  snapshot = { ...snapshot, entries: buffer.slice() }
  listeners.forEach(l => l())
}

function patch(partial: Partial<StreamSnapshot>) {
  snapshot = { ...snapshot, ...partial }
  listeners.forEach(l => l())
}

function scheduleFlush() {
  if (flushQueued) return
  flushQueued = true
  const run = () => { flushQueued = false; emit() }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
  else setTimeout(run, 16)
}

function ensureIpc() {
  if (unsubscribeIpc || !window.electronAPI) return
  unsubscribeIpc = window.electronAPI.onLogStreamData((batch) => {
    if (snapshot.paused || !batch?.length) return
    let added = 0
    const kw = snapshot.alertOnFault ? snapshot.alertKeyword.trim().toLowerCase() : ''
    for (const raw of batch as unknown as LogEntry[]) {
      const e = { ...raw, messageType: (raw.messageType || 'default').toLowerCase() }
      buffer.push(e)
      added++
      // #19 Alert on faults (and an optional keyword) while streaming.
      if (snapshot.alertOnFault && (e.messageType === 'fault' || (kw && (e.eventMessage || '').toLowerCase().includes(kw)))) {
        maybeNotify('ConLog — fault detected', `${(e.processImagePath || '').split('/').pop() || 'process'}: ${e.eventMessage || ''}`)
      }
    }
    // Trim in place only when over the cap (avoids copying the whole array each tick).
    if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX)
    snapshot = { ...snapshot, received: snapshot.received + added }
    scheduleFlush()
  })
}

export function startStream(level: StreamLevel = snapshot.level) {
  ensureIpc()
  window.electronAPI?.startLogStream({ level })
  patch({ streaming: true, level, paused: false })
}

export function stopStream() {
  window.electronAPI?.stopLogStream()
  patch({ streaming: false })
}

export function setLevel(level: StreamLevel) {
  if (level === snapshot.level) return
  // Restart the underlying stream with the new predicate; keep existing entries.
  if (snapshot.streaming) window.electronAPI?.startLogStream({ level })
  patch({ level })
}

export function togglePause() {
  patch({ paused: !snapshot.paused })
}

function persistAlerts() {
  try { localStorage.setItem(ALERT_KEY, JSON.stringify({ alertOnFault: snapshot.alertOnFault, alertKeyword: snapshot.alertKeyword })) } catch { /* ignore */ }
}
export async function setAlertOnFault(on: boolean) {
  if (on && typeof Notification !== 'undefined' && Notification.permission === 'default') {
    try { await Notification.requestPermission() } catch { /* ignore */ }
  }
  patch({ alertOnFault: on }); persistAlerts()
}
export function setAlertKeyword(kw: string) { patch({ alertKeyword: kw }); persistAlerts() }

export function clearStream() {
  buffer = []
  patch({ entries: [], received: 0 })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function useStream(): StreamSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}
