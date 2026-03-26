import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from 'react-oidc-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import { theme } from '@/theme'
import { KeyboardShortcutsProvider } from '@/context/KeyboardShortcutsContext'
import { oidcConfig } from '@/auth/oidc-config'
import { shouldRetryRequest } from '@/api/clients/retryConfig'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Selective retry: only retry on transient errors (5xx/network)
      // Not retryable: 4xx errors (invalid request, permission denied, etc.)
      retry: shouldRetryRequest,
      staleTime: 30_000,
    },
  },
})

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
              <KeyboardShortcutsProvider>
                <App />
              </KeyboardShortcutsProvider>
            </BrowserRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </AuthProvider>
  </StrictMode>,
)
