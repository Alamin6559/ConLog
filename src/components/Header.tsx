import { RefreshCw } from 'lucide-react'
import type { FetchOptions, LogEntry } from '../types'
import type { View } from './Sidebar'
import { ExportMenu } from './ExportMenu'
import { ThemeToggle } from './ThemeToggle'

const TITLES: Record<View, string> = {
  metrics: 'Metrics',
  stream: 'Live Stream',
  logs: 'Log Explorer',
  processes: 'Processes',
  settings: 'Settings',
  help: 'Help',
  process: 'Process',
}

interface HeaderProps {
  view: View
  options: FetchOptions
  onFetch: () => void
  loading: boolean
  entryCount: number
  entries: LogEntry[]
  autoRefresh: boolean
  onToggleAutoRefresh: () => void
}

export function Header({ view, options, onFetch, loading, entryCount, entries, autoRefresh, onToggleAutoRefresh }: HeaderProps) {
  const showData = view === 'metrics' || view === 'logs'
  return (
    <header
      className="flex items-center gap-4 h-14 px-5 border-b border-border bg-void shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <h1 className="text-base font-semibold text-bright tracking-tight">{TITLES[view]}</h1>
      {entryCount > 0 && view !== 'stream' && (
        <span className="text-xs text-dim font-mono">
          {entryCount.toLocaleString()} entries · last {options.last} · {options.level}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <ThemeToggle />
        {showData && (
          <label className="flex items-center gap-1.5 text-xs text-dim cursor-pointer select-none" title="Auto-refresh every 30s">
            <input type="checkbox" checked={autoRefresh} onChange={onToggleAutoRefresh} className="accent-accent" /> Auto
          </label>
        )}
        {showData && <ExportMenu entries={entries} snapshotLabel={view} />}
        {showData && (
          <button
            onClick={onFetch}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-accent border border-accent text-white text-[13px] font-medium rounded-lg hover:brightness-105 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Fetching…' : 'Refresh'}
          </button>
        )}
      </div>
    </header>
  )
}
