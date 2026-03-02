import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFormDraft } from './useFormDraft'

describe('useFormDraft', () => {
  const key = 'test-form'

  beforeEach(() => {
    sessionStorage.clear()
  })

  it('returns initial value when no draft exists', () => {
    const { result } = renderHook(() => useFormDraft(key, { name: 'initial' }))
    expect(result.current[0]).toEqual({ name: 'initial' })
  })

  it('reports no draft on first render without stored data', () => {
    const { result } = renderHook(() => useFormDraft(key, {}))
    expect(result.current[3]).toBe(false)
  })

  it('saves value to sessionStorage on setValue', () => {
    const { result } = renderHook(() => useFormDraft(key, { name: '' }))
    act(() => {
      result.current[1]({ name: 'updated' })
    })
    const stored = sessionStorage.getItem(`form-draft:${key}`)
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!)).toEqual({ name: 'updated' })
  })

  it('returns stored draft on re-mount', () => {
    sessionStorage.setItem(`form-draft:${key}`, JSON.stringify({ name: 'persisted' }))
    const { result } = renderHook(() => useFormDraft(key, { name: '' }))
    expect(result.current[0]).toEqual({ name: 'persisted' })
  })

  it('reports hasDraft true when draft exists in storage', () => {
    sessionStorage.setItem(`form-draft:${key}`, JSON.stringify({ x: 1 }))
    const { result } = renderHook(() => useFormDraft(key, { x: 0 }))
    expect(result.current[3]).toBe(true)
  })

  it('clears sessionStorage on clearDraft', () => {
    const { result } = renderHook(() => useFormDraft(key, {}))
    act(() => {
      result.current[1]({ name: 'something' })
    })
    act(() => {
      result.current[2]()
    })
    expect(sessionStorage.getItem(`form-draft:${key}`)).toBeNull()
  })
})
