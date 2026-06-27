import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type ThemeMode } from '../theme'

const ORDER: ThemeMode[] = ['system', 'light', 'dark']
const NEXT: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' }
const LABEL: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' }

export function ThemeToggle() {
  const { mode, setMode } = useTheme()
  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor
  return (
    <button
      onClick={() => setMode(NEXT[mode])}
      title={`Appearance: ${LABEL[mode]} (click to change)`}
      aria-label={`Appearance: ${LABEL[mode]}. Click to switch.`}
      className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-surface text-subtle hover:text-body hover:border-muted transition-colors"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <Icon size={16} />
    </button>
  )
}

export { ORDER as THEME_ORDER, LABEL as THEME_LABELS }
