import { useEffect } from 'react'
import { useKeyboardShortcutsContext } from '@/context/KeyboardShortcutsContext'

/**
 * Register a keyboard shortcut for the lifetime of the calling component.
 *
 * @param key - The key string to match (e.g. 'a', 'Escape', '?').
 * @param label - Human-readable description shown in the shortcuts dialog.
 * @param handler - Function to call when the shortcut fires.
 */
export function useKeyboardShortcut(key: string, label: string, handler: () => void): void {
  const { register, unregister } = useKeyboardShortcutsContext()

  useEffect(() => {
    register(key, label, handler)
    return () => unregister(key)
  }, [key, label, handler, register, unregister])
}
