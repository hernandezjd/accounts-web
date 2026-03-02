import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'

export interface ShortcutEntry {
  key: string
  label: string
  handler: () => void
}

interface KeyboardShortcutsContextValue {
  register: (key: string, label: string, handler: () => void) => void
  unregister: (key: string) => void
  shortcuts: Map<string, Omit<ShortcutEntry, 'handler'>>
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null)

export function useKeyboardShortcutsContext(): KeyboardShortcutsContextValue {
  const ctx = useContext(KeyboardShortcutsContext)
  if (!ctx) throw new Error('useKeyboardShortcutsContext must be used inside KeyboardShortcutsProvider')
  return ctx
}

/** Normalize a key string to lowercase for consistent matching. */
function normalizeKey(key: string): string {
  return key.toLowerCase()
}

interface KeyboardShortcutsProviderProps {
  children: ReactNode
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const { t } = useTranslation()
  const handlersRef = useRef<Map<string, ShortcutEntry>>(new Map())
  const [shortcuts, setShortcuts] = useState<Map<string, Omit<ShortcutEntry, 'handler'>>>(new Map())
  const [helpOpen, setHelpOpen] = useState(false)

  const register = useCallback((key: string, label: string, handler: () => void) => {
    const normalized = normalizeKey(key)
    handlersRef.current.set(normalized, { key: normalized, label, handler })
    setShortcuts((prev) => {
      const next = new Map(prev)
      next.set(normalized, { key: normalized, label })
      return next
    })
  }, [])

  const unregister = useCallback((key: string) => {
    const normalized = normalizeKey(key)
    handlersRef.current.delete(normalized)
    setShortcuts((prev) => {
      const next = new Map(prev)
      next.delete(normalized)
      return next
    })
  }, [])

  // Register the built-in "?" shortcut for showing help
  useEffect(() => {
    const key = '?'
    register(key, t('shortcuts.showHelp'), () => setHelpOpen(true))
    return () => unregister(key)
  }, [register, unregister, t])

  // Global keydown listener
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as Element
      // Skip when focus is in an editable element
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target as HTMLElement).isContentEditable
      ) {
        return
      }

      const key = event.key
      const normalized = normalizeKey(key)
      const entry = handlersRef.current.get(normalized)
      if (entry) {
        event.preventDefault()
        entry.handler()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const value = useMemo(() => ({ register, unregister, shortcuts }), [register, unregister, shortcuts])

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('shortcuts.title')}</DialogTitle>
        <DialogContent>
          <List dense>
            {Array.from(shortcuts.entries()).map(([key, { label }]) => (
              <ListItem key={key}>
                <Box sx={{ mr: 2 }}>
                  <Chip label={key === '?' ? '?' : key} size="small" variant="outlined" />
                </Box>
                <ListItemText primary={label} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </KeyboardShortcutsContext.Provider>
  )
}
