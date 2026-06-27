import { Radio, Settings, Activity, FileSearch, TrendingUp, HelpCircle, Cpu, X, ListTree } from 'lucide-react'

export type View = 'metrics' | 'stream' | 'logs' | 'settings' | 'help' | 'process' | 'processes'

interface SidebarProps {
  view: View
  onViewChange: (v: View) => void
  isStreaming: boolean
  openPids: number[]
  activePid: number | null
  pidName: (pid: number) => string
  onSelectProcess: (pid: number) => void
  onCloseProcess: (pid: number) => void
}

const NAV = [
  { id: 'metrics' as const, label: 'Metrics', icon: TrendingUp },
  { id: 'stream' as const, label: 'Live Stream', icon: Radio },
  { id: 'logs' as const, label: 'Log Explorer', icon: FileSearch },
  { id: 'processes' as const, label: 'Processes', icon: ListTree },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
  { id: 'help' as const, label: 'Help', icon: HelpCircle },
]

export function Sidebar({ view, onViewChange, isStreaming, openPids, activePid, pidName, onSelectProcess, onCloseProcess }: SidebarProps) {
  return (
    <aside className="w-[188px] shrink-0 flex flex-col bg-void border-r border-border py-3.5 px-2.5 overflow-y-auto"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="flex items-center gap-2.5 px-2 pt-5 pb-3.5">
        <div className="w-[30px] h-[30px] rounded-[9px] bg-accent text-white grid place-items-center shadow-sm">
          <Activity size={16} />
        </div>
        <div className="leading-tight">
          <div className="text-bright font-semibold text-[15px] tracking-tight">ConLog</div>
          <div className="text-dim text-[11px] font-medium">macOS log viewer</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[13px] font-medium transition-colors border ${
              view === id
                ? 'bg-accent/15 text-accent border-accent/30'
                : 'text-subtle border-transparent hover:bg-surface hover:text-body'
            }`}
          >
            <Icon size={17} className="shrink-0" />
            {label}
            {id === 'stream' && isStreaming && (
              <span className="ml-auto w-1.5 h-1.5 bg-error rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </nav>

      {/* Open processes — inspect targets live here so they never shrink the main view */}
      {openPids.length > 0 && (
        <div className="mt-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="px-2.5 mb-1.5 text-[10px] uppercase tracking-wider text-dim font-semibold">Open processes</div>
          <div className="flex flex-col gap-0.5">
            {openPids.map(pid => {
              const active = view === 'process' && activePid === pid
              return (
                <div key={pid}
                  onClick={() => onSelectProcess(pid)}
                  className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12.5px] cursor-pointer border ${
                    active ? 'bg-accent/15 text-accent border-accent/30' : 'text-subtle border-transparent hover:bg-surface hover:text-body'
                  }`}>
                  <Cpu size={14} className="shrink-0 opacity-70" />
                  <span className="truncate font-mono">{pidName(pid)}</span>
                  <span className="text-dim text-[11px]">·{pid}</span>
                  <button onClick={e => { e.stopPropagation(); onCloseProcess(pid) }}
                    className="ml-auto text-dim hover:text-error opacity-0 group-hover:opacity-100"><X size={12} /></button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-auto px-2 pt-4 text-[11px] text-dim leading-relaxed">
        Reading unified logs<br />via the macOS <span className="font-mono text-subtle">log</span> tool
      </div>
    </aside>
  )
}
