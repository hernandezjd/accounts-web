import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n'

interface AppState {
  language: string
  setLanguage: (lang: string) => void
  selectedWorkspaceId: string | null
  setSelectedWorkspaceId: (id: string | null) => void
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
    }),
    {
      name: 'app-store',
      partialize: (state) => ({ language: state.language }),
    },
  ),
)
