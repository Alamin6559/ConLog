import { useState } from 'react'
import type { FetchOptions, LogLevel, TimeRange } from '../types'
import { RefreshCw, Plus, Trash2 } from 'lucide-react'
import { useTheme, type ThemeMode } from '../theme'
import { getCustomRules, setCustomRules, type CustomRule } from '../utils/diagnostics'

function CustomRules() {
  const [rules, setRules] = useState<CustomRule[]>(() => getCustomRules())
  const [draft, setDraft] = useState<CustomRule>({ match: '', title: '', description: '', severity: 'medium' })
  const persist = (next: CustomRule[]) => { setRules(next); setCustomRules(next) }
  const add = () => {
    if (!draft.match.trim() || !draft.title.trim()) return
    persist([...rules, { ...draft, match: draft.match.trim(), title: draft.title.trim() }])
    setDraft({ match: '', title: '', description: '', severity: 'medium' })
  }
  return (
    <div className="bg-panel border border-border rounded-2xl p-5 mt-6">
      <h3 className="text-[15px] font-semibold text-bright mb-1">Custom diagnostic rules</h3>
      <p className="text-[13px] text-dim mb-4 leading-relaxed">When a log message contains your text, ConLog shows your hint (above the built-in ones). Useful for team-specific error codes.</p>
      <div className="space-y-2 mb-4">
        {rules.map((r, i) => (
          <div key={i} className="flex items-start gap-3 bg-surface border border-border rounded-lg p-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-body"><span className="text-dim">if message contains</span> <span className="font-mono text-accent">{r.match}</span></div>
              <div className="text-xs text-body font-medium mt-1">{r.title} <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded ${r.severity === 'high' ? 'bg-error/15 text-error' : r.severity === 'medium' ? 'bg-warn/15 text-warn' : 'bg-surface text-dim'}`}>{r.severity}</span></div>
              {r.description && <div className="text-[12px] text-subtle mt-0.5">{r.description}</div>}
            </div>
            <button onClick={() => persist(rules.filter((_, j) => j !== i))} className="text-dim hover:text-error shrink-0"><Trash2 size={14} /></button>
          </div>
        ))}
        {rules.length === 0 && <div className="text-[12px] text-dim">No custom rules yet.</div>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={draft.match} onChange={e => setDraft({ ...draft, match: e.target.value })} placeholder="Message contains…" className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-body outline-none" />
        <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Hint title" className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-body outline-none" />
        <input value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="What to do about it" className="col-span-2 bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-body outline-none" />
        <select value={draft.severity} onChange={e => setDraft({ ...draft, severity: e.target.value as CustomRule['severity'] })} className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-body outline-none">
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <button onClick={add} className="flex items-center justify-center gap-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:brightness-105"><Plus size={14} /> Add rule</button>
      </div>
    </div>
  )
}

interface SettingsPanelProps {
  options: FetchOptions
  onChange: (opts: FetchOptions) => void
  onFetch: () => void
  loading: boolean
  entryCount: number
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1m', label: '1 min' },
  { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '1h', label: '1 hour' },
  { value: '3h', label: '3 hours' },
  { value: '12h', label: '12 hours' },
  { value: '24h', label: '24 hours' },
]

const LOG_LEVELS: { value: LogLevel; label: string }[] = [
  { value: 'all', label: 'All levels' },
  { value: 'error', label: 'Errors' },
  { value: 'fault', label: 'Faults' },
  { value: 'debug', label: 'Debug' },
]

const THEME_OPTS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-5 border-b border-border/60 last:border-0">
      <div className="max-w-xs">
        <div className="text-[15px] font-semibold text-bright">{label}</div>
        <div className="text-[13px] text-dim mt-1 leading-relaxed">{hint}</div>
      </div>
      <div className="flex flex-wrap gap-2 justify-end max-w-[340px]">{children}</div>
    </div>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
        active ? 'bg-accent/15 text-accent border-accent/35' : 'bg-surface border-border text-subtle hover:text-body hover:border-muted'
      }`}
    >
      {children}
    </button>
  )
}

export function SettingsPanel({ options, onChange, onFetch, loading, entryCount }: SettingsPanelProps) {
  const { mode, setMode } = useTheme()
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-semibold text-bright mb-1.5 tracking-tight">Fetch settings</h2>
        <p className="text-[14px] text-subtle mb-7 leading-relaxed max-w-2xl">
          Choose the time window and detail level, then fetch historical logs from the unified log store.
          Wider windows return more data and take longer.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
          <div>
            <div className="bg-panel border border-border rounded-2xl px-6">
              <Row label="Time range" hint="How far back to read. 12h+ at all levels can return hundreds of thousands of entries.">
                {TIME_RANGES.map(r => (
                  <Pill key={r.value} active={options.last === r.value} onClick={() => onChange({ ...options, last: r.value })}>{r.label}</Pill>
                ))}
              </Row>

              <Row label="Detail level" hint="All levels keeps the error- and fault-rates meaningful on the Metrics page. Narrow further in the Log Explorer.">
                {LOG_LEVELS.map(l => (
                  <Pill key={l.value} active={options.level === l.value} onClick={() => onChange({ ...options, level: l.value })}>{l.label}</Pill>
                ))}
              </Row>

              <Row label="Appearance" hint="Follow your Mac’s light/dark setting, or pick one. Your choice is remembered.">
                {THEME_OPTS.map(t => (
                  <Pill key={t.value} active={mode === t.value} onClick={() => setMode(t.value)}>{t.label}</Pill>
                ))}
              </Row>
            </div>

            <button
              onClick={onFetch}
              disabled={loading}
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-lg text-[14px] font-semibold hover:brightness-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Fetching…' : 'Fetch logs'}
            </button>
            {entryCount > 0 && (
              <p className="text-[13px] text-subtle mt-3">
                Currently loaded: <span className="text-body font-mono">{entryCount.toLocaleString()}</span> entries
              </p>
            )}
            <CustomRules />
          </div>

          <div className="bg-panel border border-border rounded-2xl p-5">
            <h3 className="text-[13px] font-semibold text-body mb-2">About</h3>
            <p className="text-[13px] text-subtle leading-relaxed">
              ConLog reads the same unified logging system as the macOS <code className="text-accent bg-accent/10 px-1 rounded">Console</code> app,
              via the <code className="text-accent bg-accent/10 px-1 rounded">log</code> command-line tool.
            </p>
            <ul className="text-[13px] text-subtle leading-relaxed list-disc pl-5 mt-3 space-y-1.5">
              <li><span className="text-body">Live Stream</span> shows events in real time.</li>
              <li><span className="text-body">Log Explorer</span> searches the fetched snapshot.</li>
              <li>Click any <span className="text-accent font-mono">PID</span> to inspect the process.</li>
              <li>See the <span className="text-body">Help</span> tab for a full walkthrough.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
