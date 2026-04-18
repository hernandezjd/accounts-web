import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n'

interface AppState {
  language: string
  setLanguage: (lang: string) => void
  selectedWorkspaceId: string | null
  setSelectedWorkspaceId: (id: string | null) => void
  selectedOrgId: string | null
  setSelectedOrgId: (id: string | null) => void
  clearSelectedOrgId: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (lang: string) => {
        void i18n.changeLanguage(lang)
        set({ language: lang })
      },
      selectedWorkspaceId: null,
      setSelectedWorkspaceId: (id: string | null) => {
        set({ selectedWorkspaceId: id })
      },
      selectedOrgId: null,
      setSelectedOrgId: (id: string | null) => {
        set({ selectedOrgId: id })
      },
      clearSelectedOrgId: () => {
        set({ selectedOrgId: null })
      },
    }),
    {
      name: 'app-store',
      partialize: (state) => ({ language: state.language, selectedOrgId: state.selectedOrgId }),
    },
  ),
)
