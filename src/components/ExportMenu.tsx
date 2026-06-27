import { useState, useRef, useEffect } from 'react'
import { Download, FileText, Braces, Image, Check, Loader2 } from 'lucide-react'
import type { LogEntry } from '../types'
import { exportEntries, saveSnapshot } from '../utils/export'

interface ExportMenuProps {
  entries: LogEntry[]
  /** Short label used in the snapshot filename, e.g. "metrics" or "logs". */
  snapshotLabel: string
  /** Whether to offer the PNG snapshot option (the current view is visual). */
  allowSnapshot?: boolean
}

export function ExportMenu({ entries, snapshotLabel, allowSnapshot = true }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const run = async (kind: string, fn: () => Promise<string | null>) => {
    setBusy(kind)
    try {
      const result = await fn()
      if (result) {
        setDone(kind)
        setTimeout(() => setDone(null), 2000)
      }
    } catch (err) {
      console.error('export failed:', err)
    } finally {
      setBusy(null)
      setOpen(false)
    }
  }

  const disabled = entries.length === 0
  const snapshotSupported = allowSnapshot && !!window.electronAPI?.captureSnapshot

  const items = [
    { kind: 'csv', label: 'Export as CSV', sub: `${entries.length.toLocaleString()} rows`, icon: FileText, fn: () => exportEntries(entries, 'csv'), show: true },
    { kind: 'json', label: 'Export as JSON', sub: `${entries.length.toLocaleString()} entries`, icon: Braces, fn: () => exportEntries(entries, 'json'), show: true },
    { kind: 'png', label: 'Save snapshot (PNG)', sub: 'Picture of this view', icon: Image, fn: () => saveSnapshot(snapshotLabel), show: snapshotSupported },
  ].filter(i => i.show)

  return (
    <div className="relative" ref={ref} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border text-body text-xs rounded-lg hover:bg-panel transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title={disabled ? 'Fetch logs first' : 'Export logs or save a snapshot'}
      >
        {done ? <Check size={12} className="text-ok" /> : <Download size={12} />}
        {done ? 'Saved' : 'Export'}
      </button>

      {open && !disabled && (
        <div className="absolute right-0 mt-1.5 w-56 bg-panel border border-border rounded-lg shadow-2xl py-1 z-50">
          {items.map(({ kind, label, sub, icon: Icon, fn }) => (
            <button
              key={kind}
              onClick={() => run(kind, fn)}
              disabled={!!busy}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface transition-colors disabled:opacity-50"
            >
              {busy === kind
                ? <Loader2 size={14} className="text-accent animate-spin shrink-0" />
                : <Icon size={14} className="text-accent shrink-0" />}
              <div className="min-w-0">
                <div className="text-xs text-body font-medium">{label}</div>
                <div className="text-[10px] text-dim">{sub}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
