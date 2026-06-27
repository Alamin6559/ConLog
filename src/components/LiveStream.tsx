import { Play, Square, Trash2, Pause, Bell } from 'lucide-react'
import { LogTable } from './LogTable'
import { useStream, startStream, stopStream, setLevel, togglePause, clearStream, setAlertOnFault, setAlertKeyword, type StreamLevel } from '../streamStore'

interface LiveStreamProps {
  onPidClick?: (pid: number) => void
}

export function LiveStream({ onPidClick }: LiveStreamProps) {
  const { entries, streaming, paused, level, received, alertOnFault, alertKeyword } = useStream()

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-panel shrink-0">
        {!streaming ? (
          <button
            onClick={() => startStream(level)}
            className="flex items-center gap-2 px-3 py-1.5 bg-ok/20 text-ok border border-ok/30 rounded-lg text-xs font-medium hover:bg-ok/30 transition-colors"
          >
            <Play size={13} /> Start Stream
          </button>
        ) : (
          <button
            onClick={stopStream}
            className="flex items-center gap-2 px-3 py-1.5 bg-error/20 text-error border border-error/30 rounded-lg text-xs font-medium hover:bg-error/30 transition-colors"
          >
            <Square size={13} /> Stop Stream
          </button>
        )}

        {streaming && (
          <button
            onClick={togglePause}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
              paused ? 'bg-warn/20 text-warn border-warn/30 hover:bg-warn/30' : 'bg-surface text-dim border-border hover:text-body'
            }`}
          >
            <Pause size={13} /> {paused ? 'Resume' : 'Pause'}
          </button>
        )}

        {/* Level selector — mirrors Console's "All Messages" vs "Errors and Faults" */}
        <div className="flex bg-surface border border-border rounded-lg p-0.5 gap-0.5">
          {([['errors', 'Errors & faults'], ['all', 'All messages']] as [StreamLevel, string][]).map(([v, lbl]) => (
            <button key={v} onClick={() => setLevel(v)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${level === v ? 'bg-accent/20 text-accent' : 'text-dim hover:text-body'}`}>
              {lbl}
            </button>
          ))}
        </div>

        {streaming && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-error rounded-full animate-pulse" />
            <span className="text-xs text-error font-medium">LIVE</span>
          </div>
        )}

        {/* #19 Alert on faults (+ optional keyword) via native notification */}
        <button onClick={() => setAlertOnFault(!alertOnFault)} title="Notify on faults"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${alertOnFault ? 'bg-warn/20 text-warn border-warn/30' : 'bg-surface text-dim border-border hover:text-body'}`}>
          <Bell size={13} className={alertOnFault ? 'fill-warn' : ''} /> Alerts
        </button>
        {alertOnFault && (
          <input value={alertKeyword} onChange={e => setAlertKeyword(e.target.value)} placeholder="+ keyword (optional)"
            className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-body placeholder:text-dim outline-none w-40" />
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-dim font-mono">{received.toLocaleString()} captured</span>
          <button onClick={clearStream} className="flex items-center gap-2 px-3 py-1.5 text-dim hover:text-body text-xs transition-colors">
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="text-dim text-4xl mb-4">◉</div>
            <div className="text-body text-sm">{streaming ? 'Waiting for events…' : 'No live events yet'}</div>
            <div className="text-subtle text-xs">
              {streaming ? 'Errors and faults will appear here as they happen.' : 'Click "Start Stream" to begin capturing macOS logs in real time.'}
            </div>
          </div>
        </div>
      ) : (
        <LogTable entries={entries} isStream onPidClick={onPidClick} />
      )}
    </div>
  )
}
