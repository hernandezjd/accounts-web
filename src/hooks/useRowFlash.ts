import { useCallback, useEffect, useRef, useState } from 'react'

const FLASH_MS = 2000

/**
 * Highlight one row for a moment (for example the transaction that was just saved).
 *
 * @returns [id of the row to highlight, or null; function that starts the highlight]
 */
export function useRowFlash(): [string | null, (id: string) => void] {
  const [flashedId, setFlashedId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = useCallback((id: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setFlashedId(id)
    timerRef.current = setTimeout(() => setFlashedId(null), FLASH_MS)
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return [flashedId, flash]
}
