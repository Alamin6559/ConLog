import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSort } from './useSort'

interface Row { name: string; n: number }
const rows: Row[] = [
  { name: 'beta', n: 2 },
  { name: 'alpha', n: 10 },
  { name: 'gamma', n: 1 },
]

describe('useSort', () => {
  it('does not reorder until a column is chosen', () => {
    const { result } = renderHook(() => useSort(rows))
    expect(result.current.sorted.map(r => r.name)).toEqual(['beta', 'alpha', 'gamma'])
  })

  it('sorts numerically and toggles desc → asc', () => {
    const { result } = renderHook(() => useSort(rows))
    act(() => result.current.toggle('n'))            // first click → desc
    expect(result.current.sorted.map(r => r.n)).toEqual([10, 2, 1])
    act(() => result.current.toggle('n'))            // second click → asc
    expect(result.current.sorted.map(r => r.n)).toEqual([1, 2, 10])
  })

  it('sorts strings with locale/numeric awareness', () => {
    const { result } = renderHook(() => useSort(rows))
    act(() => result.current.toggle('name'))         // desc
    expect(result.current.sorted.map(r => r.name)).toEqual(['gamma', 'beta', 'alpha'])
  })
})
