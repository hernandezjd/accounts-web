import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { AppHeader } from './AppHeader'
import { useAppStore } from '@/store/appStore'
import * as useAuthContextModule from '@/hooks/useAuthContext'

vi.mock('@/api/apiClient', () => ({
  apiClient: {
    workspace: { GET: vi.fn() },
    organization: { GET: vi.fn() },
  },
}))

// AppHeader uses useParams — wrap in a route that supplies workspaceId
import { Route, Routes } from 'react-router-dom'

function renderHeader() {
  return renderWithProviders(
    <Routes>
      <Route path="*" element={<AppHeader onMenuToggle={vi.fn()} />} />
    </Routes>,
  )
}

import { apiClient } from '@/api/apiClient'

type MockWorkspaceClient = { GET: ReturnType<typeof vi.fn> }
type MockOrgClient = { GET: ReturnType<typeof vi.fn> }

const org1 = { id: 'org-1', name: 'Acme Corp', contactEmail: 'acme@example.com' }
const org2 = { id: 'org-2', name: 'Globex Corp', contactEmail: 'globex@example.com' }

function mockWorkspaceGet() {
  vi.mocked((apiClient.workspace as unknown as MockWorkspaceClient).GET).mockResolvedValue({
    data: undefined,
    response: new Response(),
  })
}

function mockOrganizationGet(org: unknown) {
  vi.mocked((apiClient.organization as unknown as MockOrgClient).GET).mockResolvedValue({
    data: org,
    response: new Response(),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  useAppStore.setState({ selectedOrgId: 'org-1' })
  mockWorkspaceGet()
  mockOrganizationGet(org1)
  // Default auth mock with user having access to one workspace and one organization
  vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
    user: { profile: { workspaces: ['workspace-1'], organization_ids: ['org-1'] } },
    isAuthenticated: true,
    isLoading: false,
  } as any)
})

describe('AppHeader', () => {
  it('shows current org name when selectedOrgId is set', async () => {
    renderHeader()
    await waitFor(() => {
      expect(screen.getByTestId('current-org-name')).toHaveTextContent('Acme Corp')
    })
  })

  it('hides Switch Org button when user has only one org', async () => {
    renderHeader()
    await waitFor(() => {
      expect(screen.queryByTestId('switch-org-button')).not.toBeInTheDocument()
    })
  })

  it('shows Switch Org button when user has multiple orgs', async () => {
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: { profile: { workspaces: ['workspace-1'], organization_ids: ['org-1', 'org-2'] } },
      isAuthenticated: true,
      isLoading: false,
    } as any)
    renderHeader()
    await waitFor(() => {
      expect(screen.getByTestId('switch-org-button')).toBeInTheDocument()
    })
  })

  it('clears selectedOrgId when Switch Org is clicked', async () => {
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: { profile: { workspaces: ['workspace-1'], organization_ids: ['org-1', 'org-2'] } },
      isAuthenticated: true,
      isLoading: false,
    } as any)
    renderHeader()
    await waitFor(() => {
      expect(screen.getByTestId('switch-org-button')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId('switch-org-button'))
    expect(useAppStore.getState().selectedOrgId).toBeNull()
  })
})
