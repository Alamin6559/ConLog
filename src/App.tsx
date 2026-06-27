import { useState, useCallback, useEffect, useMemo } from 'react'
import { Sidebar, type View } from './components/Sidebar'
import { Header } from './components/Header'
import { MetricsPage } from './components/MetricsPage'
import { LogTable } from './components/LogTable'
import { LiveStream } from './components/LiveStream'
import { SettingsPanel } from './components/SettingsPanel'
import { ProcessView } from './components/ProcessView'
import { ProcessesView } from './components/ProcessesView'
import { HelpView } from './components/HelpView'
import { getProcessName } from './utils/stats'
import { useStream, togglePause } from './streamStore'
import type { FetchOptions, LogEntry } from './types'

function generateMockLogs(count = 400): LogEntry[] {
  const processes = [
    '/usr/libexec/airportd', '/System/Library/CoreServices/Finder.app/Contents/MacOS/Finder',
    '/usr/sbin/mDNSResponder', '/System/Library/CoreServices/WindowServer',
    '/usr/libexec/nsurlsessiond', '/Applications/Xcode.app/Contents/MacOS/Xcode',
    '/usr/bin/coreaudiod', '/usr/libexec/searchpartyd',
    '/System/Library/PrivateFrameworks/ContinuityCapture.framework/Versions/A/Support/ContinuityCaptureAgent',
    '/usr/sbin/socketfilterfw',
  ]
  const subsystems = ['com.apple.wifi','com.apple.security','com.apple.network','com.apple.SkyLight','com.apple.networkextension','com.apple.CMContinuityCapture', undefined]
  const types = ['default','info','debug','error','error','error','fault'] as const
  const messages = [
    '_CGXPackagesSetWindowConstraints: Invalid window',
    'No current verdict available, cannot report flow closed',
    'Missing CMContinuityCaptureCapabilitiesKey_Devices',
    'CMContinuityCaptureUserOnboarding No valid device to onboard',
    'com.apple.backupd.sandbox.xpc: connection invalid',
    'Simulating crash. Reason: <private>',
    'No BeaconStoreActor available!',
    'SID: 0x0 task mismatch buffer not found',
    'Unable to obtain a task name port right: (os/kern) failure',
    'Unable to serialize CFObject: Property list invalid for format: 200',
    'Auth timeout setAuthenticationStatus: failed!',
    'LOI fetch timed out',
  ]
  const pids = [410, 514, 586, 644, 685, 744, 839, 433, 426]
  const now = Date.now()
  return Array.from({ length: count }, () => {
    const type = types[Math.floor(Math.random() * types.length)]
    const pidIdx = Math.floor(Math.random() * pids.length)
    return {
      timestamp: new Date(now - Math.random() * 3600000).toISOString(),
      messageType: type,
      processID: pids[pidIdx],
      processImagePath: processes[pidIdx % processes.length],
      subsystem: subsystems[Math.floor(Math.random() * subsystems.length)],
      category: 'default',
      eventMessage: messages[Math.floor(Math.random() * messages.length)],
      threadID: Math.floor(Math.random() * 1000),
    }
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export default function App() {
  const [view, setView] = useState<View>('metrics')
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const { streaming } = useStream()
  const [options, setOptions] = useState<FetchOptions>({ last: '1h', level: 'all' })
  // Process inspector: multiple PIDs open as tabs so you can compare them.
  const [openPids, setOpenPids] = useState<number[]>([])
  const [activePid, setActivePid] = useState<number | null>(null)

  const openProcess = useCallback((pid: number) => {
    setOpenPids(prev => (prev.includes(pid) ? prev : [...prev, pid]))
    setActivePid(pid)
    setView('process')
  }, [])
  const selectProcess = useCallback((pid: number) => { setActivePid(pid); setView('process') }, [])
  const closeProcess = useCallback((pid: number) => {
    setOpenPids(prev => {
      const next = prev.filter(p => p !== pid)
      setActivePid(a => {
        if (a !== pid) return a
        const fallback = next[next.length - 1] ?? null
        if (fallback == null) setView(v => (v === 'process' ? 'logs' : v))
        return fallback
      })
      return next
    })
  }, [])

  // Name lookup for the sidebar's open-process list — build the map once per fetch
  // (avoids an O(n) scan of 15k entries on every lookup).
  const pidName = useMemo(() => {
    const map = new Map<number, string>()
    for (const e of entries) if (!map.has(e.processID)) map.set(e.processID, getProcessName(e))
    return (pid: number) => map.get(pid) ?? `PID ${pid}`
  }, [entries])

  // Check after mount — preload may not be injected synchronously
  const isElectron = !!window.electronAPI

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.fetchLogs(options)
        const normalized = (Array.isArray(result) ? result as LogEntry[] : []).map(e => ({
          ...e,
          messageType: (e.messageType || 'default').toLowerCase(),
        }))
        setEntries(normalized)
      } else {
        await new Promise(r => setTimeout(r, 800))
        setEntries(generateMockLogs(400))
      }
    } catch (err) {
      console.error('fetch-logs error:', err)
    } finally {
      setLoading(false)
    }
  }, [options])

  useEffect(() => { fetchLogs() }, []) // eslint-disable-line

  // #20 Optional auto-refresh of the historical snapshot (every 30s).
  const [autoRefresh, setAutoRefresh] = useState(false)
  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(() => { fetchLogs() }, 30000)
    return () => clearInterval(t)
  }, [autoRefresh, fetchLogs])

  // #22 Keyboard shortcuts: Cmd+R refresh, Cmd+F focus search, Space pause/resume
  // stream, Esc clear filters (broadcast to the focused table).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') { e.preventDefault(); fetchLogs() }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        const input = document.querySelector('[data-logsearch]') as HTMLInputElement | null
        if (input) { e.preventDefault(); input.focus(); input.select() }
      } else if (e.key === ' ' && !typing && (view === 'stream' || streaming)) {
        e.preventDefault(); togglePause()
      } else if (e.key === 'Escape') {
        if (typing) (el as HTMLInputElement).blur()
        window.dispatchEvent(new CustomEvent('conlog-clear-filters'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fetchLogs, view, streaming])

  return (
    <div className="h-screen flex bg-void text-body overflow-hidden">
      <Sidebar
        view={view} onViewChange={setView} isStreaming={streaming}
        openPids={openPids} activePid={activePid} pidName={pidName}
        onSelectProcess={selectProcess} onCloseProcess={closeProcess}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header view={view} options={options} onFetch={fetchLogs} loading={loading} entryCount={entries.length} entries={entries}
          autoRefresh={autoRefresh} onToggleAutoRefresh={() => setAutoRefresh(a => !a)} />

        <main className="flex-1 overflow-hidden flex flex-col">
          {!isElectron && (
            <div className="px-4 py-2 bg-warn/10 border-b border-warn/20 text-xs text-warn">
              Browser demo mode — showing mock data. Run via Electron for real macOS logs.
            </div>
          )}

          {view === 'metrics' && <MetricsPage entries={entries} loading={loading} onOpenProcess={openProcess} />}
          {view === 'logs' && <LogTable entries={entries} onPidClick={openProcess} persist />}
          {view === 'processes' && <ProcessesView entries={entries} onOpenProcess={openProcess} />}
          {view === 'stream' && <LiveStream onPidClick={openProcess} />}
          {view === 'help' && <HelpView />}
          {view === 'process' && activePid != null && (
            <ProcessView pid={activePid} entries={entries} onClose={closeProcess} onOpenProcess={openProcess} />
          )}
          {view === 'settings' && (
            <SettingsPanel
              options={options}
              onChange={setOptions}
              onFetch={fetchLogs}
              loading={loading}
              entryCount={entries.length}
            />
          )}
        </main>
      </div>
    </div>
  )
}
