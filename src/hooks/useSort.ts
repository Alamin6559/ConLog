import { useMemo, useState } from 'react'

export type SortDir = 'asc' | 'desc'

/**
 * Excel-like column sorting. Click a column to sort desc, click again for asc.
 * Numbers sort numerically; everything else by locale-aware string compare.
 */
export function useSort<T>(rows: T[], initialKey: keyof T | null = null, initialDir: SortDir = 'desc') {
  const [key, setKey] = useState<keyof T | null>(initialKey)
  const [dir, setDir] = useState<SortDir>(initialDir)

  const sorted = useMemo(() => {
    if (!key) return rows
    const copy = rows.slice()
    copy.sort((a, b) => {
      const av = a[key] as unknown
      const bv = b[key] as unknown
      let cmp: number
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true })
      return dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, key, dir])

  const toggle = (k: keyof T) => {
    if (k === key) setDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setKey(k); setDir('desc') }
  }

  return { sorted, key, dir, toggle }
}
