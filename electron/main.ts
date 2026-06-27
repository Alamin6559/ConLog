import { app, BrowserWindow, ipcMain, dialog, shell, session } from 'electron'
import * as path from 'path'
import { spawn, execFileSync } from 'child_process'
import { writeFile } from 'fs/promises'
import { pathToFileURL } from 'url'

const DEV_URL = 'http://localhost:5173'
const ALLOWED_LAST = new Set(['1m', '5m', '15m', '1h', '3h', '12h', '24h'])

// Invoke system tools by absolute path. Resolving via PATH would let a poisoned
// PATH (inherited when the app is launched from a shell) substitute a different
// binary for one of these. These locations are fixed on macOS and SIP-protected.
const BIN = {
  log: '/usr/bin/log',
  ps: '/bin/ps',
  lsof: '/usr/sbin/lsof',
  codesign: '/usr/bin/codesign',
} as const

// Built as CommonJS (see vite.config.ts), so __dirname is provided by Node.
let mainWindow: BrowserWindow | null = null

// Prevent multiple instances (fixes the double-open crash)
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// Content-Security-Policy. Dev needs to allow Vite's HMR (inline React-refresh
// preamble + eval + ws), so it's relaxed; packaged builds get a strict policy.
// Fonts are bundled via @fontsource, so no remote origin is permitted.
function cspFor(isDev: boolean): string {
  const script = isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self'"
  const connect = isDev ? `connect-src 'self' ws://localhost:5173 ${DEV_URL}` : "connect-src 'self'"
  return [
    "default-src 'self'",
    script,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    connect,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'none'",
  ].join('; ')
}

function createWindow() {
  // Preload is emitted alongside main.js in dist-electron (see vite.config.ts).
  const preloadPath = path.join(__dirname, 'preload.js')
  const isDev = !app.isPackaged

  // Apply a CSP to every response in this window's session.
  const policy = cspFor(isDev)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [policy] } })
  })

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#161922',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: preloadPath,
    },
  })

  // In dev we load the Vite server; packaged builds load the bundled index.html.
  const indexHtml = path.join(__dirname, '..', 'dist', 'index.html')
  const allowedPrefix = isDev ? DEV_URL : pathToFileURL(indexHtml).toString()

  // Lock down navigation: deny popups and only allow staying within the app.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(allowedPrefix)) event.preventDefault()
  })

  if (isDev) mainWindow.loadURL(DEV_URL)
  else mainWindow.loadFile(indexHtml)
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Fetch historical logs — with a HARD CAP via head to prevent runaway memory
ipcMain.handle('fetch-logs', async (_event, payload?: { last?: unknown; level?: unknown }) => {
  const last = payload?.last
  const level = payload?.level
  return new Promise((resolve) => {
    const args = ['show', '--style', 'ndjson']
    // Allowlist the time window (argv, so no injection — this just rejects junk).
    if (typeof last === 'string' && ALLOWED_LAST.has(last)) args.push('--last', last)
    else args.push('--last', '1h')
    // Respect the chosen level. macOS messageType values are capitalized.
    if (level === 'fault') {
      args.push('--predicate', 'messageType == "Fault"')
    } else if (level === 'debug') {
      args.push('--predicate', 'messageType == "Debug"')
    } else if (level === 'error') {
      args.push('--predicate', 'messageType == "Error" OR messageType == "Fault"')
    }
    // level === 'all' → no predicate, returns all message types

    const proc = spawn(BIN.log, args)
    console.log('[fetch-logs] running: log', args.join(' '))
    const entries: unknown[] = []
    let buffer = ''
    let killed = false
    const MAX_ENTRIES = 15000

    proc.stdout.on('data', d => {
      buffer += d.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const t = line.trim()
        if (!t) continue
        try { entries.push(JSON.parse(t)) } catch { /* skip non-JSON lines */ }
      }
      if (entries.length >= MAX_ENTRIES && !killed) {
        killed = true
        proc.kill()
      }
    })

    proc.stderr.on('data', d => { console.error('[fetch-logs] stderr:', d.toString().slice(0, 200)) })

    let finished = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const finish = () => {
      if (finished) return
      finished = true
      if (timer) { clearTimeout(timer); timer = null } // don't leak the watchdog
      const t = buffer.trim()
      if (t) { try { entries.push(JSON.parse(t)) } catch { /* skip */ } }
      console.log('[fetch-logs] parsed entries:', entries.length)
      resolve(entries.slice(0, MAX_ENTRIES))
    }

    proc.on('close', finish)
    timer = setTimeout(() => { if (!killed) { killed = true; proc.kill() } finish() }, 20000)
  })
})

ipcMain.handle('get-process-info', async (_event, pid: unknown) => {
  // IPC data is dynamically typed at runtime — validate to a positive integer and
  // pass everything to execFileSync as argv (no shell), so a malicious value can't
  // inject commands.
  const safePid = parseInt(String(pid), 10)
  if (!Number.isInteger(safePid) || safePid < 0) return null
  const arg = String(safePid)
  try {
    // Single-token fields only (no spaces) so a whitespace split is safe.
    const psOut = execFileSync(BIN.ps, ['-p', arg, '-o', 'pid=,ppid=,user=,pcpu=,pmem=,vsz=,rss=,stat=,nice=,pri=,etime=,time='],
      { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    if (!psOut) return null
    let cmdline = ''
    try { cmdline = execFileSync(BIN.ps, ['-p', arg, '-o', 'args='], { timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { /* skip */ }
    let comm = ''
    try { comm = execFileSync(BIN.ps, ['-p', arg, '-o', 'comm='], { timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { /* skip */ }
    let started = ''
    try { started = execFileSync(BIN.ps, ['-p', arg, '-o', 'lstart='], { timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { /* skip */ }
    let openFiles = 0
    try {
      const lsofOut = execFileSync(BIN.lsof, ['-p', arg], { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
      openFiles = lsofOut.split('\n').filter(Boolean).length
    } catch { /* skip */ }
    let threads = 0
    try {
      const m = execFileSync(BIN.ps, ['-M', '-p', arg], { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
      threads = Math.max(0, m.split('\n').filter(Boolean).length - 1) // minus header row
    } catch { /* skip */ }
    const parts = psOut.split(/\s+/)
    const user = parts[2] || ''

    // Best-effort sandbox detection from the executable's codesign entitlements.
    let sandboxed: 'yes' | 'no' | 'unknown' = 'unknown'
    const exePath = cmdline.split(' ')[0]
    if (exePath && exePath.startsWith('/')) {
      try {
        const ents = execFileSync(BIN.codesign, ['-d', '--entitlements', ':-', exePath],
          { timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
        sandboxed = ents.includes('com.apple.security.app-sandbox') ? 'yes' : 'no'
      } catch { /* leave unknown */ }
    }

    return {
      pid: parseInt(parts[0]) || safePid, ppid: parseInt(parts[1]) || 0, user,
      cpu: parseFloat(parts[3]) || 0, mem: parseFloat(parts[4]) || 0,
      vsz: parseInt(parts[5]) || 0, rss: parseInt(parts[6]) || 0,
      stat: parts[7] || '', comm, cmdline, openFiles,
      nice: parseInt(parts[8]) || 0, priority: parseInt(parts[9]) || 0,
      elapsed: parts[10] || '', cpuTime: parts[11] || '', started, threads,
      isRoot: user === 'root', sandboxed,
    }
  } catch { return null }
})

// Reveal a file/process executable in Finder.
ipcMain.handle('show-in-finder', async (_event, p: unknown) => {
  if (typeof p === 'string' && p.startsWith('/')) { shell.showItemInFolder(p); return true }
  return false
})

// List ALL running processes (like Activity Monitor) via a single ps call.
ipcMain.handle('list-processes', async () => {
  try {
    const out = execFileSync(BIN.ps, ['-axo', 'pid=,ppid=,user=,pcpu=,pmem=,rss=,stat=,comm='],
      { timeout: 5000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
    const rows: unknown[] = []
    for (const line of out.split('\n')) {
      // 7 fixed single-token fields, then the executable path (may contain spaces).
      const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+(\S+)\s+(.*)$/)
      if (!m) continue
      const path = m[8].trim()
      const name = path.split('/').pop() || path
      rows.push({
        pid: parseInt(m[1]), ppid: parseInt(m[2]), user: m[3],
        cpu: parseFloat(m[4]) || 0, mem: parseFloat(m[5]) || 0, rss: parseInt(m[6]) || 0,
        stat: m[7], name, path, isRoot: m[3] === 'root',
      })
    }
    return rows
  } catch { return [] }
})

// Save a data export (CSV / JSON) via a native save dialog
ipcMain.handle('export-data', async (_event, payload: { content?: unknown; defaultName?: unknown; filters?: unknown }) => {
  if (!mainWindow) return { saved: false }
  const content = typeof payload?.content === 'string' ? payload.content : ''
  // basename: defaultName is a suggested filename, never a path.
  const defaultName = path.basename(
    typeof payload?.defaultName === 'string' ? payload.defaultName : '') || 'conlog-export.txt'
  // Keep only well-formed { name, extensions[] } filter entries.
  const filters = Array.isArray(payload?.filters)
    ? payload.filters.filter((f): f is { name: string; extensions: string[] } =>
        !!f && typeof f.name === 'string' && Array.isArray(f.extensions) && f.extensions.every((x: unknown) => typeof x === 'string' && x.length > 0))
    : []
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export logs',
    defaultPath: defaultName,
    filters,
  })
  if (canceled || !filePath) return { saved: false }
  try {
    await writeFile(filePath, content, 'utf-8')
    return { saved: true, path: filePath }
  } catch (err) {
    console.error('[export-data] write failed:', err)
    return { saved: false, error: String(err) }
  }
})

// Capture a PNG snapshot of the current window view and save it
ipcMain.handle('capture-snapshot', async (_event, payload: { defaultName?: unknown }) => {
  if (!mainWindow) return { saved: false }
  // Validate rather than destructure: a missing payload would throw here, and
  // defaultName is only ever a filename, never a path.
  const raw = typeof payload?.defaultName === 'string' ? payload.defaultName : ''
  const defaultName = path.basename(raw) || 'conlog-snapshot.png'
  try {
    const image = await mainWindow.webContents.capturePage()
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save snapshot',
      defaultPath: defaultName,
      filters: [{ name: 'PNG image', extensions: ['png'] }],
    })
    if (canceled || !filePath) return { saved: false }
    await writeFile(filePath, image.toPNG())
    return { saved: true, path: filePath }
  } catch (err) {
    console.error('[capture-snapshot] failed:', err)
    return { saved: false, error: String(err) }
  }
})

// Live stream.
// Correctness: use `--style ndjson` (one JSON object per line) — NOT `--style json`,
// which emits a pretty-printed multi-line array that can't be parsed line-by-line.
// `log stream` has no `--level error`; errors/faults are selected via a predicate.
// Performance: parsed objects are buffered and flushed to the renderer as a single
// array on an interval, instead of one IPC message per event, to avoid a re-render
// storm (the unified log can emit hundreds/sec).
let activeStream: ReturnType<typeof spawn> | null = null
let streamLineBuf = ''
let streamOutBatch: unknown[] = []
let streamFlushTimer: ReturnType<typeof setInterval> | null = null

const STREAM_FLUSH_MS = 300
const STREAM_BATCH_CAP = 2000 // drop overflow within a single flush window

function stopStream() {
  if (streamFlushTimer) { clearInterval(streamFlushTimer); streamFlushTimer = null }
  if (activeStream) { activeStream.kill(); activeStream = null }
  streamLineBuf = ''
  streamOutBatch = []
}

ipcMain.on('start-log-stream', (_event, opts?: { level?: 'errors' | 'all' }) => {
  stopStream()
  const level = opts?.level ?? 'errors'
  const args = ['stream', '--style', 'ndjson']
  if (level === 'errors') {
    args.push('--predicate', 'messageType == "error" OR messageType == "fault"')
  }
  // level === 'all' → default level (no predicate); much higher volume.
  activeStream = spawn(BIN.log, args)
  console.log('[log-stream] running: log', args.join(' '))

  activeStream.stdout?.on('data', (data) => {
    streamLineBuf += data.toString()
    // Guard against a pathological line with no newline growing without bound.
    if (streamLineBuf.length > 1_000_000) streamLineBuf = ''
    const lines = streamLineBuf.split('\n')
    streamLineBuf = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        // Skips the leading "Filtering the log data using ..." notice (non-JSON).
        streamOutBatch.push(JSON.parse(trimmed))
      } catch { /* skip non-JSON notice lines */ }
    }
  })
  activeStream.stderr?.on('data', d => console.error('[log-stream] stderr:', d.toString().slice(0, 200)))

  // Flush accumulated events to the renderer as one array per tick.
  streamFlushTimer = setInterval(() => {
    if (!streamOutBatch.length) return
    const batch = streamOutBatch.length > STREAM_BATCH_CAP
      ? streamOutBatch.slice(-STREAM_BATCH_CAP)
      : streamOutBatch
    streamOutBatch = []
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-stream-data', batch)
    }
  }, STREAM_FLUSH_MS)
})

ipcMain.on('stop-log-stream', () => { stopStream() })
