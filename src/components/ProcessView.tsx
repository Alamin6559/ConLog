import { useEffect, useMemo, useState } from 'react'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Cpu, Terminal, FolderOpen, Copy, Check, HelpCircle, AlertTriangle, X, LayoutGrid, FileText } from 'lucide-react'
import type { LogEntry, ProcessInfo } from '../types'
import { getProcessName, formatBytes, computeTimeline, groupErrorsByPattern } from '../utils/stats'
import { getDiagnosticHints } from '../utils/diagnostics'
import { useThemeColors } from '../theme'
import { LogTable } from './LogTable'

interface ProcessViewProps {
  pid: number
  entries: LogEntry[]
  onClose: (pid: number) => void
  onOpenProcess?: (pid: number) => void
}

type Tab = 'overview' | 'logs' | 'errors'

const FIELD_HELP: Record<string, string> = {
  CPU: 'Share of one CPU core in use right now (can exceed 100% across cores).',
  Memory: 'Percentage of physical RAM the process is using.',
  RSS: 'Resident memory — actual physical RAM held.',
  VSZ: 'Virtual size — reserved address space. Multi-GB is NORMAL, not real RAM use.',
  Threads: 'Number of threads currently in the process.',
  'CPU time': 'Total CPU time consumed since the process started.',
  Started: 'When the process was launched.',
  Elapsed: 'How long the process has been running.',
  Priority: 'Scheduling priority (higher = scheduled sooner).',
  Nice: 'Niceness value; lower means higher scheduling priority.',
  PPID: 'Parent process ID — what launched it.',
  State: 'R running, S sleeping, I idle, Z zombie; s = session leader, + = foreground.',
  'Open files': 'Open file descriptors — files, sockets and pipes.',
  User: 'Account it runs as. “root” = full system privileges.',
}

function Badge({ kind, children }: { kind: 'root' | 'sandbox' | 'neutral'; children: React.ReactNode }) {
  const cls = kind === 'root' ? 'bg-error/15 text-error' : kind === 'sandbox' ? 'bg-ok/15 text-ok' : 'bg-surface text-subtle border border-border'
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${cls}`}>{children}</span>
}
function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-panel border border-border rounded-xl p-4">
      <div className="text-xs font-medium text-body mb-3 flex items-center gap-1.5">{icon}{title}</div>
      {children}
    </div>
  )
}
function Spark({ data, dataKey, color, label, suffix, current }:
  { data: { i: number }[]; dataKey: string; color: string; label: string; suffix: string; current: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] text-dim">{label}</span>
        <span className="text-sm font-mono font-semibold" style={{ color }}>{current.toFixed(1)}{suffix}</span>
      </div>
      <ResponsiveContainer width="100%" height={48}>
        <LineChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-panel border border-border rounded-xl px-4 py-3">
      <div className="text-2xl font-bold font-mono" style={{ color }}>{value.toLocaleString()}</div>
      <div className="text-[11px] text-subtle mt-0.5">{label}</div>
    </div>
  )
}

export function ProcessView({ pid, entries, onClose, onOpenProcess }: ProcessViewProps) {
  const [tab, setTab] = useState<Tab>('overview')
  const [info, setInfo] = useState<ProcessInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [history, setHistory] = useState<{ i: number; cpu: number; mem: number }[]>([])
  const c = useThemeColors()

  // Poll process info every 3s; accumulate a rolling CPU/RAM history for sparklines.
  useEffect(() => {
    let cancelled = false
    let i = 0
    setInfo(null); setLoading(true); setHistory([])
    const load = () => {
      if (!window.electronAPI?.getProcessInfo) { setLoading(false); return }
      window.electronAPI.getProcessInfo(pid).then(d => {
        if (cancelled) return
        setInfo(d); setLoading(false)
        if (d) setHistory(h => [...h, { i: i++, cpu: d.cpu, mem: d.mem }].slice(-40))
      }).catch(() => !cancelled && setLoading(false))
    }
    load()
    const t = setInterval(load, 3000)
    return () => { cancelled = true; clearInterval(t) }
  }, [pid])

  const name = useMemo(() => { const e = entries.find(x => x.processID === pid); return e ? getProcessName(e) : `PID ${pid}` }, [entries, pid])
  const pidEntries = useMemo(() => entries.filter(e => e.processID === pid), [entries, pid])
  const counts = useMemo(() => {
    let errors = 0, faults = 0, debug = 0, info2 = 0
    for (const e of pidEntries) {
      if (e.messageType === 'error') errors++
      else if (e.messageType === 'fault') faults++
      else if (e.messageType === 'debug') debug++
      else info2++
    }
    return { total: pidEntries.length, errors, faults, debug, info: info2 }
  }, [pidEntries])
  const timeline = useMemo(() => computeTimeline(pidEntries), [pidEntries])
  const errorGroups = useMemo(() => groupErrorsByPattern(pidEntries), [pidEntries])
  const path = info?.cmdline?.split(' ')[0] || pidEntries[0]?.processImagePath || ''

  const cells: [string, string][] = info ? [
    ['CPU', `${info.cpu}%`], ['Memory', `${info.mem}%`], ['RSS', formatBytes(info.rss)], ['VSZ', formatBytes(info.vsz)],
    ['Threads', info.threads ? String(info.threads) : '—'], ['CPU time', info.cpuTime || '—'],
    ['Elapsed', info.elapsed || '—'], ['Started', info.started || '—'],
    ['Priority', String(info.priority)], ['Nice', String(info.nice)],
    ['PPID', String(info.ppid)], ['State', info.stat || '—'],
    ['Open files', info.openFiles ? String(info.openFiles) : '—'], ['User', info.user || '—'],
  ] : []

  const copyPath = () => { if (path) { navigator.clipboard?.writeText(path); setCopied(true); setTimeout(() => setCopied(false), 1500) } }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutGrid size={14} /> },
    { id: 'logs', label: `Logs (${counts.total.toLocaleString()})`, icon: <FileText size={14} /> },
    { id: 'errors', label: `Errors (${counts.errors + counts.faults})`, icon: <AlertTriangle size={14} /> },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* header + sub-tabs */}
      <div className="px-6 pt-4 border-b border-border shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-bright tracking-tight">{name}</h1>
              <span className="text-sm text-dim font-mono">PID {pid}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {info?.isRoot ? <Badge kind="root">running as root</Badge> : info && <Badge kind="neutral">user: {info.user}</Badge>}
              {info && (info.sandboxed === 'yes' ? <Badge kind="sandbox">sandboxed</Badge> : info.sandboxed === 'no' ? <Badge kind="neutral">not sandboxed</Badge> : <Badge kind="neutral">sandbox: unknown</Badge>)}
              {!info && !loading && <Badge kind="neutral">not running</Badge>}
            </div>
          </div>
          <button onClick={() => onClose(pid)} className="flex items-center gap-1.5 px-3 py-1.5 text-dim hover:text-body text-xs border border-border rounded-lg hover:border-muted transition-colors"><X size={14} /> Close</button>
        </div>
        <div className="flex gap-1 mt-3 -mb-px">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition-colors ${tab === t.id ? 'border-accent text-accent' : 'border-transparent text-dim hover:text-body'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* severity counts */}
          <div className="grid grid-cols-5 gap-3">
            <Stat label="Total log entries" value={counts.total} color={c.info} />
            <Stat label="Errors" value={counts.errors} color={c.error} />
            <Stat label="Faults" value={counts.faults} color={c.fault} />
            <Stat label="Debug" value={counts.debug} color={c.debug} />
            <Stat label="Info / default" value={counts.info} color={c.accent} />
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            <Card title="Live process info" icon={<Cpu size={12} className="text-accent" />}>
              <button onClick={() => setShowHelp(s => !s)} className="float-right -mt-7 text-dim hover:text-body flex items-center gap-1 text-[11px]"><HelpCircle size={12} /> What do these mean?</button>
              {loading && <div className="text-xs text-subtle">Looking up process…</div>}
              {info && (
                <div className="grid grid-cols-2 gap-2">
                  {cells.map(([k, v]) => (
                    <div key={k} className="bg-surface rounded-lg p-2.5" title={FIELD_HELP[k]}>
                      <div className="text-[10px] text-dim flex items-center gap-1">{k}<HelpCircle size={9} className="opacity-40" /></div>
                      <div className="text-sm text-bright font-mono mt-0.5 truncate" title={v}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              {showHelp && (
                <div className="mt-2 bg-surface border border-border rounded-lg p-3 space-y-1.5">
                  {Object.entries(FIELD_HELP).map(([k, d]) => (<div key={k} className="text-[11px] leading-relaxed"><span className="text-body font-medium">{k}:</span> <span className="text-subtle">{d}</span></div>))}
                </div>
              )}
              {!info && !loading && <div className="text-xs text-dim">Process {pid} is no longer running, so live stats aren’t available.</div>}
              {path && (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <div className="text-[10px] uppercase tracking-wider text-dim mb-1.5 flex items-center gap-1"><Terminal size={11} /> Location</div>
                  <div className="bg-void rounded-lg p-2.5 font-mono text-[10px] text-subtle break-all border border-border">{path}</div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => window.electronAPI?.showInFinder(path)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-body hover:border-muted transition-colors"><FolderOpen size={13} /> Show in Finder</button>
                    <button onClick={copyPath} className="flex items-center gap-1.5 px-2.5 py-1.5 text-dim hover:text-body text-xs transition-colors">{copied ? <Check size={13} className="text-ok" /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy path'}</button>
                  </div>
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card title="Live CPU & memory" icon={<Cpu size={12} className="text-accent" />}>
                {history.length < 2 ? (
                  <div className="text-xs text-dim py-6 text-center">Sampling live usage… (updates every 3s)</div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <Spark data={history} dataKey="cpu" color={c.error} label="CPU" suffix="%" current={info?.cpu ?? 0} />
                    <Spark data={history} dataKey="mem" color={c.accent} label="Memory" suffix="%" current={info?.mem ?? 0} />
                  </div>
                )}
              </Card>
              <Card title="Log volume over time" icon={<LayoutGrid size={12} className="text-accent" />}>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={timeline}>
                    <defs>
                      <linearGradient id="pvErr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c.error} stopOpacity={0.3} /><stop offset="95%" stopColor={c.error} stopOpacity={0} /></linearGradient>
                      <linearGradient id="pvTot" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c.accent} stopOpacity={0.25} /><stop offset="95%" stopColor={c.accent} stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: c.axis }} /><YAxis tick={{ fontSize: 10, fill: c.axis }} />
                    <Tooltip contentStyle={{ background: 'rgb(var(--c-panel))', border: '1px solid rgb(var(--c-border))', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="total" stroke={c.accent} fill="url(#pvTot)" strokeWidth={2} name="total" />
                    <Area type="monotone" dataKey="errors" stroke={c.error} fill="url(#pvErr)" strokeWidth={2} name="errors" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
              {errorGroups[0] && (
                <Card title="Top error" icon={<AlertTriangle size={12} className="text-warn" />}>
                  <div className="text-[11px] font-mono text-body break-words">{errorGroups[0].sample.eventMessage}</div>
                  <div className="text-[11px] text-dim mt-1">{errorGroups[0].count}× · see the Errors tab for all of them</div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <LogTable entries={pidEntries} onPidClick={onOpenProcess} />
      )}

      {tab === 'errors' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {errorGroups.length === 0 && <div className="text-sm text-dim">No errors or faults logged for this process.</div>}
          {errorGroups.map((g, i) => {
            const hint = getDiagnosticHints(g.sample)[0]
            return (
              <div key={i} className="bg-panel border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-dim shrink-0 mt-0.5 w-12 text-right">{g.count}×</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-mono text-body break-words">{g.sample.eventMessage}</div>
                    {hint && (
                      <div className={`mt-2 rounded-lg p-2.5 border text-xs ${hint.severity === 'high' ? 'bg-error/5 border-error/20' : hint.severity === 'medium' ? 'bg-warn/5 border-warn/20' : 'bg-surface border-border'}`}>
                        <span className={`font-medium ${hint.severity === 'high' ? 'text-error' : hint.severity === 'medium' ? 'text-warn' : 'text-body'}`}>{hint.title}: </span>
                        <span className="text-subtle leading-relaxed">{hint.description}</span>
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${g.sample.messageType === 'fault' ? 'bg-fault/15 text-fault' : 'bg-error/15 text-error'}`}>{g.sample.messageType.toUpperCase()}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
