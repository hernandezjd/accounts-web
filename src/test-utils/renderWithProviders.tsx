import { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom'
import i18n from '@/i18n'
import { theme } from '@/theme'
import { KeyboardShortcutsProvider } from '@/context/KeyboardShortcutsContext'

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  routerProps?: MemoryRouterProps
}

export function renderWithProviders(
  ui: ReactElement,
  { routerProps, ...renderOptions }: RenderWithProvidersOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <MemoryRouter {...routerProps}>
              <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
            </MemoryRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </I18nextProvider>
    )
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}
