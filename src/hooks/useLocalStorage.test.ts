import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should return the default value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'))
    expect(result.current[0]).toBe('defaultValue')
  })

  it('should return the stored value from localStorage', () => {
    localStorage.setItem('testKey', JSON.stringify('storedValue'))
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'))
    expect(result.current[0]).toBe('storedValue')
  })

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'))

    act(() => {
      result.current[1]('newValue')
    })

    expect(result.current[0]).toBe('newValue')
    expect(localStorage.getItem('testKey')).toBe(JSON.stringify('newValue'))
  })

  it('should handle JSON objects', () => {
    const initialObj = { name: 'test', count: 42 }
    const { result } = renderHook(() => useLocalStorage('testKey', initialObj))

    const newObj = { name: 'updated', count: 100 }
    act(() => {
      result.current[1](newObj)
    })

    expect(result.current[0]).toEqual(newObj)
    expect(localStorage.getItem('testKey')).toBe(JSON.stringify(newObj))
  })

  it('should remove value from localStorage', () => {
    localStorage.setItem('testKey', JSON.stringify('someValue'))
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'))

    act(() => {
      result.current[2]() // removeValue
    })

    expect(result.current[0]).toBe('defaultValue')
    expect(localStorage.getItem('testKey')).toBeNull()
  })

  it('should handle null values', () => {
    const { result } = renderHook(() => useLocalStorage<string | null>('testKey', null))

    act(() => {
      result.current[1]('value')
    })

    expect(result.current[0]).toBe('value')

    act(() => {
      result.current[1](null)
    })

    expect(result.current[0]).toBeNull()
  })

  it('should handle storage errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full')
    })

    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'))

    act(() => {
      result.current[1]('newValue')
    })

    expect(consoleSpy).toHaveBeenCalled()
    expect(result.current[0]).toBe('newValue') // State still updates even if storage fails

    consoleSpy.mockRestore()
    storageSpy.mockRestore()
  })

  it('should handle JSON parse errors when reading', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem('testKey', 'invalid-json')

    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'))

    expect(result.current[0]).toBe('defaultValue')
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should support custom types', () => {
    interface User {
      id: string
      name: string
      age: number
    }

    const defaultUser: User = { id: '1', name: 'John', age: 30 }
    const { result } = renderHook(() => useLocalStorage<User>('userKey', defaultUser))

    const newUser: User = { id: '2', name: 'Jane', age: 25 }
    act(() => {
      result.current[1](newUser)
    })

    expect(result.current[0]).toEqual(newUser)
  })

  it('should handle number types', () => {
    const { result } = renderHook(() => useLocalStorage<number>('numberKey', 0))

    act(() => {
      result.current[1](42)
    })

    expect(result.current[0]).toBe(42)
    expect(localStorage.getItem('numberKey')).toBe('42')
  })

  it('should handle boolean types', () => {
    const { result } = renderHook(() => useLocalStorage<boolean>('boolKey', false))

    act(() => {
      result.current[1](true)
    })

    expect(result.current[0]).toBe(true)
    expect(localStorage.getItem('boolKey')).toBe('true')
  })
})
