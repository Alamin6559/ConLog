import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'conlog-theme'

export function getStoredMode(): ThemeMode {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
}

export function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode
}

/** Apply the resolved theme to <html data-theme>. Safe to call before React mounts. */
export function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved
}

interface ThemeCtx {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (m: ThemeMode) => void
}

const Ctx = createContext<ThemeCtx | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode)
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(getStoredMode()))

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    localStorage.setItem(STORAGE_KEY, m)
    const r = resolveTheme(m)
    setResolved(r)
    applyTheme(r)
  }, [])

  // Re-resolve when following the system and the OS appearance changes.
  useEffect(() => {
    if (mode !== 'system' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const r = resolveTheme('system')
      setResolved(r)
      applyTheme(r)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTheme must be used within ThemeProvider')
  return c
}

export interface ChartColors {
  grid: string
  axis: string
  legend: string
  error: string
  fault: string
  debug: string
  accent: string
  warn: string
  ok: string
  info: string
  other: string
  bright: string
  /** Categorical palette for pies/multi-series. */
  palette: string[]
}

function cssVar(name: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v ? `rgb(${v})` : '#888'
}

/**
 * Resolve theme-aware colors for Recharts (which can't use Tailwind classes).
 * Recomputes whenever the resolved theme changes.
 */
export function useThemeColors(): ChartColors {
  const { resolved } = useTheme()
  return useMemo(() => ({
    grid: cssVar('--c-chart-grid'),
    axis: cssVar('--c-chart-axis'),
    legend: cssVar('--c-chart-legend'),
    error: cssVar('--c-error'),
    fault: cssVar('--c-fault'),
    debug: cssVar('--c-debug'),
    accent: cssVar('--c-accent'),
    warn: cssVar('--c-warn'),
    ok: cssVar('--c-ok'),
    info: cssVar('--c-accent'),
    other: cssVar('--c-chart-other'),
    bright: cssVar('--c-bright'),
    palette: [
      cssVar('--c-error'), cssVar('--c-fault'), cssVar('--c-warn'), cssVar('--c-accent'),
      cssVar('--c-ok'), '#a78bfa', '#34d399', '#fb923c', '#60a5fa', '#f472b6',
    ],
  }), [resolved]) // eslint-disable-line react-hooks/exhaustive-deps
}
