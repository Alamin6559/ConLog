/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    fetchLogs: (options: { last?: string; level?: string }) => Promise<unknown[]>
    getProcessInfo: (pid: number) => Promise<import('./types').ProcessInfo | null>
    showInFinder: (path: string) => Promise<boolean>
    listProcesses: () => Promise<import('./types').ProcessListItem[]>
    startLogStream: (opts?: { level?: 'errors' | 'all' }) => void
    stopLogStream: () => void
    onLogStreamData: (callback: (batch: Record<string, unknown>[]) => void) => () => void
    exportData: (payload: { content: string; defaultName: string; filters: { name: string; extensions: string[] }[] }) => Promise<{ saved: boolean; path?: string; error?: string }>
    captureSnapshot: (payload: { defaultName: string }) => Promise<{ saved: boolean; path?: string; error?: string }>
  }
}
