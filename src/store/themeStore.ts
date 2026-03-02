import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type ThemeSettings, DEFAULT_THEME_SETTINGS } from '@/theme'

interface ThemeStoreState {
  themesByTenant: Record<string, ThemeSettings>
  getThemeForTenant: (tenantId: string) => ThemeSettings
  setThemeForTenant: (tenantId: string, settings: ThemeSettings) => void
  resetThemeForTenant: (tenantId: string) => void
}

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set, get) => ({
      themesByTenant: {},

      getThemeForTenant: (tenantId: string): ThemeSettings => {
        return get().themesByTenant[tenantId] ?? DEFAULT_THEME_SETTINGS
      },

      setThemeForTenant: (tenantId: string, settings: ThemeSettings) => {
        set((state) => ({
          themesByTenant: { ...state.themesByTenant, [tenantId]: settings },
        }))
      },

      resetThemeForTenant: (tenantId: string) => {
        set((state) => {
          const next = { ...state.themesByTenant }
          delete next[tenantId]
          return { themesByTenant: next }
        })
      },
    }),
    {
      name: 'theme-store',
      partialize: (state) => ({ themesByTenant: state.themesByTenant }),
    },
  ),
)
