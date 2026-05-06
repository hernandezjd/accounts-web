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
import * as useAuthContextModule from '@/hooks/useAuthContext'
import { AppShell } from './AppShell'

vi.mock('@/api/apiClient', () => ({
  apiClient: {
    workspace: {
      GET: vi.fn(),
    },
  },
}))

import { apiClient } from '@/api/apiClient'

const defaultAuthMock = {
  user: { profile: { workspaces: ['workspace-1'], organization_ids: [] } },
  isAuthenticated: true,
  isLoading: false,
}

const mockWorkspace = { id: 'workspace-1', name: 'Acme Corp', status: 'active' as const }
const mockWorkspace2 = { id: 'workspace-2', name: 'Other Corp', status: 'active' as const }

/**
 * Render AppShell inside a real Route so that useParams() gets :workspaceId.
 */
function renderAppShell(initialPath = '/workspaces/workspace-1/accounting') {
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
                <Route path="/workspaces/:workspaceId/*" element={<AppShell />}>
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
  vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue(defaultAuthMock as any)
  vi.mocked((apiClient.workspace as unknown as { GET: ReturnType<typeof vi.fn> }).GET).mockImplementation(
    (url: string) => {
      return Promise.resolve({ data: mockWorkspace, response: new Response() })
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
    expect(nav).toHaveTextContent('Initial Balances')
    expect(nav).toHaveTextContent('Reports')
    expect(nav).toHaveTextContent('Setup')
  })

  it('shows active workspace name in header', async () => {
    renderAppShell()
    await waitFor(() => {
      expect(screen.getByTestId('active-workspace-name')).toHaveTextContent('Acme Corp')
    })
  })

  it('Switch Workspace button clears sessionStorage and is rendered when multiple workspaces exist', async () => {
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: { profile: { workspaces: ['workspace-1', 'workspace-2'], organization_ids: [] } },
      isAuthenticated: true,
      isLoading: false,
    } as any)
    sessionStorage.setItem('lastWorkspaceId', 'workspace-1')
    renderAppShell()
    await waitFor(() => {
      expect(screen.getByTestId('switch-workspace-button')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId('switch-workspace-button'))
    expect(sessionStorage.getItem('lastWorkspaceId')).toBeNull()
  })

  it('hides Switch Workspace button when only one workspace exists', async () => {
    renderAppShell()
    await waitFor(() => {
      expect(screen.getByTestId('active-workspace-name')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('switch-workspace-button')).not.toBeInTheDocument()
  })

  it('syncs workspaceId to sessionStorage on mount', async () => {
    renderAppShell()
    await waitFor(() => {
      expect(sessionStorage.getItem('lastWorkspaceId')).toBe('workspace-1')
    })
  })

  it('hides Switch Organization button when user has no organizations', async () => {
    renderAppShell()
    await waitFor(() => {
      expect(screen.getByTestId('active-workspace-name')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('switch-org-button')).not.toBeInTheDocument()
  })

  it('hides Switch Organization button when user has only one organization', async () => {
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: { profile: { workspaces: ['workspace-1'], organization_ids: ['org-1'] } },
      isAuthenticated: true,
      isLoading: false,
    } as any)
    renderAppShell()
    await waitFor(() => {
      expect(screen.getByTestId('active-workspace-name')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('switch-org-button')).not.toBeInTheDocument()
  })

  it('shows Switch Organization button when user has multiple organizations', async () => {
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: { profile: { workspaces: ['workspace-1'], organization_ids: ['org-1', 'org-2'] } },
      isAuthenticated: true,
      isLoading: false,
    } as any)
    renderAppShell()
    await waitFor(() => {
      expect(screen.getByTestId('switch-org-button')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId('switch-org-button'))
    expect(sessionStorage.getItem('lastWorkspaceId')).toBeNull()
  })
})
