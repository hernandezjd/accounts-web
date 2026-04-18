import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { OrgPickerPage } from './OrgPickerPage'
import { useAppStore } from '@/store/appStore'

vi.mock('@/api/apiClient', () => ({
  apiClient: {
    organization: {
      GET: vi.fn(),
    },
  },
}))

import { apiClient } from '@/api/apiClient'

type MockOrgClient = { GET: ReturnType<typeof vi.fn> }

function mockOrgGet(data: unknown) {
  vi.mocked((apiClient.organization as unknown as MockOrgClient).GET).mockResolvedValue({ data, response: new Response() })
}

const twoOrgs = [
  { id: 'org-1', name: 'Acme Corp', contactEmail: 'acme@example.com' },
  { id: 'org-2', name: 'Globex Corp', contactEmail: 'globex@example.com' },
]

beforeEach(() => {
  vi.clearAllMocks()
  useAppStore.setState({ selectedOrgId: null })
})

describe('OrgPickerPage', () => {
  it('shows the picker title', async () => {
    mockOrgGet(twoOrgs)
    renderWithProviders(<OrgPickerPage />)
    expect(screen.getByTestId('org-picker-title')).toBeInTheDocument()
  })

  it('renders org list when multiple orgs exist', async () => {
    mockOrgGet(twoOrgs)
    renderWithProviders(<OrgPickerPage />)
    await waitFor(() => {
      expect(screen.getByTestId('org-list')).toBeInTheDocument()
    })
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Globex Corp')).toBeInTheDocument()
  })

  it('auto-selects and navigates when only one org', async () => {
    const singleOrg = [{ id: 'org-1', name: 'Acme Corp', contactEmail: 'acme@example.com' }]
    mockOrgGet(singleOrg)
    renderWithProviders(<OrgPickerPage />)
    await waitFor(() => {
      expect(useAppStore.getState().selectedOrgId).toBe('org-1')
    })
  })

  it('stores selectedOrgId on org selection', async () => {
    mockOrgGet(twoOrgs)
    renderWithProviders(<OrgPickerPage />)
    await waitFor(() => {
      expect(screen.getByTestId('org-list')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId('org-item-org-1'))
    expect(useAppStore.getState().selectedOrgId).toBe('org-1')
  })

  it('shows no-orgs message when list is empty', async () => {
    mockOrgGet([])
    renderWithProviders(<OrgPickerPage />)
    await waitFor(() => {
      expect(screen.getByTestId('no-orgs-message')).toBeInTheDocument()
    })
  })
})
