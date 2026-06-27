import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  fetchLogs: (options: { last?: string; level?: string }) =>
    ipcRenderer.invoke('fetch-logs', options),

  getProcessInfo: (pid: number) =>
    ipcRenderer.invoke('get-process-info', pid),

  showInFinder: (path: string) => ipcRenderer.invoke('show-in-finder', path),

  listProcesses: () => ipcRenderer.invoke('list-processes'),

  startLogStream: (opts?: { level?: 'errors' | 'all' }) => ipcRenderer.send('start-log-stream', opts),
  stopLogStream: () => ipcRenderer.send('stop-log-stream'),

  exportData: (payload: { content: string; defaultName: string; filters: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('export-data', payload),

  captureSnapshot: (payload: { defaultName: string }) =>
    ipcRenderer.invoke('capture-snapshot', payload),

  // Delivers a batch (array) of log objects per tick.
  onLogStreamData: (callback: (batch: Record<string, unknown>[]) => void) => {
    const sub = (_e: Electron.IpcRendererEvent, batch: Record<string, unknown>[]) => callback(batch)
    ipcRenderer.on('log-stream-data', sub)
    return () => ipcRenderer.removeListener('log-stream-data', sub)
  },
})
