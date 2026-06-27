export interface LogEntry {
  timestamp: string
  messageType: 'default' | 'info' | 'debug' | 'error' | 'fault' | string
  processID: number
  processImagePath?: string
  senderImagePath?: string
  subsystem?: string
  category?: string
  eventMessage: string
  threadID?: number
  activityIdentifier?: number
  eventType?: string
  userID?: number
  formatString?: string
  traceID?: number
  machTimestamp?: number
  processImageUUID?: string
  senderImageUUID?: string
  senderProgramCounter?: number
  parentActivityIdentifier?: number
  bootUUID?: string
  backtrace?: { frames?: { imageOffset?: number; imageUUID?: string }[] }
}

export interface ProcessInfo {
  pid: number
  ppid: number
  user: string
  cpu: number
  mem: number
  vsz: number
  rss: number
  stat: string
  comm: string
  cmdline: string
  openFiles: number
  isRoot: boolean
  /** Sandbox status from codesign entitlements; 'unknown' when it can't be determined. */
  sandboxed: 'yes' | 'no' | 'unknown'
  threads: number
  cpuTime: string
  elapsed: string
  started: string
  nice: number
  priority: number
}

export interface ProcessListItem {
  pid: number
  ppid: number
  user: string
  cpu: number
  mem: number
  rss: number
  stat: string
  name: string
  path: string
  isRoot: boolean
}

export type LogLevel = 'all' | 'error' | 'fault' | 'debug'
export type TimeRange = '1m' | '5m' | '15m' | '1h' | '3h' | '12h' | '24h'

export interface FetchOptions {
  last: TimeRange
  level: LogLevel
}

export interface ProcessStats {
  name: string
  pid?: number
  errors: number
  faults: number
  debug: number
  info: number
  total: number
  path?: string
  /** True when any log entry from this process ran as uid 0 (root). */
  isRoot?: boolean
}

export interface TimelineBucket {
  time: string
  errors: number
  faults: number
  debug: number
  info: number
  total: number
}

export interface SubsystemStats {
  name: string
  errors: number
  faults: number
  total: number
}

export interface DiagnosticHint {
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
}
