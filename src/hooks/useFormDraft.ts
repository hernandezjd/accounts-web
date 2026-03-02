import { useState, useEffect, useCallback } from 'react'

/**
 * Persists form state in sessionStorage so in-progress work survives
 * transient network errors. The draft is restored on re-mount and cleared
 * on explicit save or cancel.
 *
 * Uses sessionStorage (not localStorage) so drafts don't persist across
 * browser sessions.
 *
 * @param key     - unique key for this form in sessionStorage
 * @param initial - initial/default value if no draft exists
 * @returns [value, setValue, clearDraft, hasDraft]
 */
export function useFormDraft<T>(
  key: string,
  initial: T,
): [T, (v: T) => void, () => void, boolean] {
  const storageKey = `form-draft:${key}`

  const [value, setValueState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) return JSON.parse(stored) as T
    } catch {
      // ignore parse errors
    }
    return initial
  })

  const [hasDraft] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(storageKey) !== null
    } catch {
      return false
    }
  })

  const setValue = useCallback(
    (v: T) => {
      setValueState(v)
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(v))
      } catch {
        // ignore storage errors
      }
    },
    [storageKey],
  )

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey)
    } catch {
      // ignore storage errors
    }
  }, [storageKey])

  // Update draft whenever value changes
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      // ignore storage errors
    }
  }, [storageKey, value])

  return [value, setValue, clearDraft, hasDraft]
}
