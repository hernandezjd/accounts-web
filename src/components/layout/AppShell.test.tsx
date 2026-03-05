import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import { theme } from '@/theme'
import { KeyboardShortcutsProvider } from '@/context/KeyboardShortcutsContext'
import { AppShell } from './AppShell'

vi.mock('@/api/clients', () => ({
  tenantClient: { GET: vi.fn() },
  commandClient: { GET: vi.fn() },
  queryClient: { GET: vi.fn() },
}))

import { tenantClient } from '@/api/clients'

const mockTenant = { id: 'tenant-1', name: 'Acme Corp', status: 'active' as const }
const mockTenant2 = { id: 'tenant-2', name: 'Other Corp', status: 'active' as const }

/**
 * Render AppShell inside a real Route so that useParams() gets :tenantId.
 */
function renderAppShell(initialPath = '/tenants/tenant-1/accounting') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={[initialPath]}>
            <KeyboardShortcutsProvider>
              <Routes>
                <Route path="/tenants/:tenantId/*" element={<AppShell />}>
                  <Route path="*" element={<div>page content</div>} />
                </Route>
              </Routes>
            </KeyboardShortcutsProvider>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  vi.mocked((tenantClient as unknown as { GET: ReturnType<typeof vi.fn> }).GET).mockImplementation(
    (url: string) => {
      if (url === '/tenants') return Promise.resolve({ data: [mockTenant], error: undefined })
      return Promise.resolve({ data: mockTenant, error: undefined })
    },
  )
})

afterEach(() => {
  sessionStorage.clear()
})

describe('AppShell', () => {
  it('renders all 7 navigation items', async () => {
    renderAppShell()
    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'navigation' })).toBeInTheDocument()
    })
    const nav = screen.getByRole('list', { name: 'navigation' })
    expect(nav).toHaveTextContent('Accounting')
    expect(nav).toHaveTextContent('Accounts')
    expect(nav).toHaveTextContent('Third Parties')
    expect(nav).toHaveTextContent('Transactions')
    expect(nav).toHaveTextContent('Transaction Types')
    expect(nav).toHaveTextContent('Reports')
    expect(nav).toHaveTextContent('Setup')
  })

  it('shows active tenant name in header', async () => {
    renderAppShell()
    await waitFor(() => {
      expect(screen.getByTestId('active-tenant-name')).toHaveTextContent('Acme Corp')
    })
  })

  it('Switch Tenant button clears sessionStorage and is rendered when multiple tenants exist', async () => {
    vi.mocked((tenantClient as unknown as { GET: ReturnType<typeof vi.fn> }).GET).mockImplementation(
      (url: string) => {
        if (url === '/tenants')
          return Promise.resolve({ data: [mockTenant, mockTenant2], error: undefined })
        return Promise.resolve({ data: mockTenant, error: undefined })
      },
    )
    sessionStorage.setItem('lastTenantId', 'tenant-1')
    renderAppShell()
    await waitFor(() => {
      expect(screen.getByTestId('switch-tenant-button')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId('switch-tenant-button'))
    expect(sessionStorage.getItem('lastTenantId')).toBeNull()
  })

  it('hides Switch Tenant button when only one tenant exists', async () => {
    renderAppShell()
    await waitFor(() => {
      expect(screen.getByTestId('active-tenant-name')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('switch-tenant-button')).not.toBeInTheDocument()
  })

  it('syncs tenantId to sessionStorage on mount', async () => {
    renderAppShell()
    await waitFor(() => {
      expect(sessionStorage.getItem('lastTenantId')).toBe('tenant-1')
    })
  })
})
