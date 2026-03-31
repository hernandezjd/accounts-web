import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type ThemeSettings, DEFAULT_THEME_SETTINGS } from '@/theme'

interface ThemeStoreState {
  themesByWorkspace: Record<string, ThemeSettings>
  getThemeForWorkspace: (workspaceId: string) => ThemeSettings
  setThemeForWorkspace: (workspaceId: string, settings: ThemeSettings) => void
  resetThemeForWorkspace: (workspaceId: string) => void
}

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set, get) => ({
      themesByWorkspace: {},

      getThemeForWorkspace: (workspaceId: string): ThemeSettings => {
        return get().themesByWorkspace[workspaceId] ?? DEFAULT_THEME_SETTINGS
      },

      setThemeForWorkspace: (workspaceId: string, settings: ThemeSettings) => {
        set((state) => ({
          themesByWorkspace: { ...state.themesByWorkspace, [workspaceId]: settings },
        }))
      },

      resetThemeForWorkspace: (workspaceId: string) => {
        set((state) => {
          const next = { ...state.themesByWorkspace }
          delete next[workspaceId]
          return { themesByWorkspace: next }
        })
      },
    }),
    {
      name: 'theme-store',
      partialize: (state) => ({ themesByWorkspace: state.themesByWorkspace }),
    },
  ),
)
