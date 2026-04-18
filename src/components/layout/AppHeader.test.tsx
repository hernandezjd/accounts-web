import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { AppHeader } from './AppHeader'
import { useAppStore } from '@/store/appStore'

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

function mockOrgList(orgs: unknown[]) {
  vi.mocked((apiClient.organization as unknown as MockOrgClient).GET).mockImplementation((url: string) => {
    if (url === '/organizations') return Promise.resolve({ data: orgs, response: new Response() })
    return Promise.resolve({ data: orgs[0], response: new Response() })
  })
}

function mockWorkspaceGet() {
  vi.mocked((apiClient.workspace as unknown as MockWorkspaceClient).GET).mockResolvedValue({
    data: undefined,
    response: new Response(),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  useAppStore.setState({ selectedOrgId: 'org-1' })
  mockWorkspaceGet()
})

describe('AppHeader', () => {
  it('shows current org name when selectedOrgId is set', async () => {
    mockOrgList([org1])
    renderHeader()
    await waitFor(() => {
      expect(screen.getByTestId('current-org-name')).toHaveTextContent('Acme Corp')
    })
  })

  it('hides Switch Org button when user has only one org', async () => {
    mockOrgList([org1])
    renderHeader()
    await waitFor(() => {
      expect(screen.queryByTestId('switch-org-button')).not.toBeInTheDocument()
    })
  })

  it('shows Switch Org button when user has multiple orgs', async () => {
    mockOrgList([org1, org2])
    renderHeader()
    await waitFor(() => {
      expect(screen.getByTestId('switch-org-button')).toBeInTheDocument()
    })
  })

  it('clears selectedOrgId when Switch Org is clicked', async () => {
    mockOrgList([org1, org2])
    renderHeader()
    await waitFor(() => {
      expect(screen.getByTestId('switch-org-button')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId('switch-org-button'))
    expect(useAppStore.getState().selectedOrgId).toBeNull()
  })
})
