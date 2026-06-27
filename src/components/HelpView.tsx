import { TrendingUp, Radio, FileSearch, Cpu, Download, Lightbulb } from 'lucide-react'

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-accent">{icon}</span>
        <h3 className="text-sm font-semibold text-bright">{title}</h3>
      </div>
      <div className="text-[13px] text-subtle leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

export function HelpView() {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl">
        <h2 className="text-2xl font-semibold text-bright mb-1.5 tracking-tight">How ConLog works</h2>
        <p className="text-[14px] text-subtle mb-7 leading-relaxed max-w-3xl">
          ConLog reads the <span className="text-body font-medium">macOS unified logging system</span> — the same
          source as Apple’s <span className="font-mono text-accent">Console</span> app — through the built-in
          <span className="font-mono text-accent"> log</span> command-line tool. Nothing leaves your machine.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Card icon={<Radio size={16} />} title="Live Stream vs Log Explorer">
            <p><span className="text-body font-medium">Live Stream</span> shows events <span className="text-body">as they happen</span>, in real time — like <span className="font-mono">tail -f</span>. Press Start and new errors/faults appear at the bottom. Use it to watch what a problem does <em>right now</em>.</p>
            <p><span className="text-body font-medium">Log Explorer</span> browses a <span className="text-body">snapshot of past logs</span> you fetched (e.g. the last hour). It doesn’t update live, but you can search, filter, sort and scroll the whole history. Use it to investigate something that already happened.</p>
            <p className="text-dim text-xs">Same data source — Live Stream is “now”, Log Explorer is “what was”.</p>
          </Card>

          <Card icon={<TrendingUp size={16} />} title="Metrics">
            <p>A dashboard over the fetched snapshot: the <span className="text-body">error-rate</span> and <span className="text-body">fault-rate</span> across all messages, timelines, the noisiest subsystems, and repeated error patterns.</p>
            <p>The <span className="text-body font-medium">Process summary</span> table is the heart of it — sort any column, see which processes run as root, and double-click (or click a PID) to inspect a process.</p>
          </Card>

          <Card icon={<FileSearch size={16} />} title="Log Explorer columns">
            <p>Columns mirror Console: <span className="font-mono text-xs">Time, Type, PID, Process, Library, Subsystem, Category, Thread, Activity, Message</span>.</p>
            <p>Click a header to <span className="text-body">sort</span>, use the column filters to narrow values, toggle <span className="text-body">Wrap</span> for long messages, and drag column edges to resize. Click any row to see a diagnostic.</p>
          </Card>

          <Card icon={<Cpu size={16} />} title="Process inspector">
            <p>Click any <span className="text-accent font-mono">PID</span> to open a process. It shows live CPU/RAM, whether it runs as <span className="text-body">root</span> or is <span className="text-body">sandboxed</span>, its on-disk location (with <span className="text-body">Show in Finder</span>), its errors grouped by pattern, and recent log lines.</p>
            <p>Open several at once — they stack under <span className="text-body">Open processes</span> in the sidebar so you can compare them.</p>
          </Card>

          <Card icon={<Lightbulb size={16} />} title="Diagnostics">
            <p>Click a log row (or open a process) and ConLog matches the message against common macOS patterns — memory pressure, crashes, sandbox/TCC denials, Continuity, Time Machine and more — with a plain-English explanation and what to do next.</p>
          </Card>

          <Card icon={<Download size={16} />} title="Export & snapshots">
            <p>The <span className="text-body">Export</span> button saves the loaded logs as <span className="font-mono">CSV</span> or <span className="font-mono">JSON</span>, or captures a <span className="font-mono">PNG</span> snapshot of the current view — handy for sharing a problem.</p>
            <p className="text-dim text-xs">Tip: set the time range and detail level in <span className="text-body">Settings</span>, then Refresh.</p>
          </Card>
        </div>

        <div className="mt-4 bg-panel border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-bright mb-2">Good to know</h3>
          <ul className="text-[13px] text-subtle leading-relaxed list-disc pl-5 space-y-1">
            <li>A huge <span className="font-mono">VSZ</span> (e.g. 400+ GB) is normal — it’s reserved virtual address space, not real RAM. Watch <span className="font-mono">RSS</span> for actual memory.</li>
            <li>Per-process GPU usage isn’t available without elevated privileges, so it isn’t shown.</li>
            <li>Most macOS errors are benign background noise; the diagnostics help separate signal from noise.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
