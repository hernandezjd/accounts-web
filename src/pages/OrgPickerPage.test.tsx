import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { OrgPickerPage } from './OrgPickerPage'
import { useAppStore } from '@/store/appStore'
import * as useUserProfileModule from '@/hooks/api/useUserProfile'

vi.mock('@/api/apiClient', () => ({
  apiClient: {
    organization: {
      GET: vi.fn(),
    },
    user: {
      GET: vi.fn(),
    },
  },
}))

import { apiClient } from '@/api/apiClient'

type MockOrgClient = { GET: ReturnType<typeof vi.fn> }
type MockUserClient = { GET: ReturnType<typeof vi.fn> }

function mockOrgGet(data: unknown) {
  vi.mocked((apiClient.organization as unknown as MockOrgClient).GET).mockResolvedValue({ data, response: new Response() })
}

function mockUserGet(data: unknown) {
  vi.mocked((apiClient.user as unknown as MockUserClient).GET).mockResolvedValue({ data, response: new Response() })
}

const twoOrgs = [
  { id: 'org-1', name: 'Acme Corp', contactEmail: 'acme@example.com' },
  { id: 'org-2', name: 'Globex Corp', contactEmail: 'globex@example.com' },
]

const userBelongsToOrg1 = { id: 'user-1', email: 'user@example.com', name: 'John Doe', status: 'ACTIVE', organizationIds: ['org-1'], createdAt: '2024-01-01T00:00:00Z' }

beforeEach(() => {
  vi.clearAllMocks()
  useAppStore.setState({ selectedOrgId: null })
  // Mock useUserProfile to return user data by default
  vi.spyOn(useUserProfileModule, 'useUserProfile').mockReturnValue({
    data: userBelongsToOrg1,
    isLoading: false,
    isError: false,
    error: null,
  } as any)
})

describe('OrgPickerPage', () => {
  it('shows the picker title', async () => {
    mockOrgGet(twoOrgs)
    renderWithProviders(<OrgPickerPage />)
    expect(screen.getByTestId('org-picker-title')).toBeInTheDocument()
  })

  it('filters to show only orgs the user belongs to', async () => {
    mockOrgGet(twoOrgs)
    // User belongs to both orgs
    vi.spyOn(useUserProfileModule, 'useUserProfile').mockReturnValue({
      data: { ...userBelongsToOrg1, organizationIds: ['org-1', 'org-2'] },
      isLoading: false,
      isError: false,
      error: null,
    } as any)
    renderWithProviders(<OrgPickerPage />)
    await waitFor(() => {
      expect(screen.getByTestId('org-list')).toBeInTheDocument()
    })
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Globex Corp')).toBeInTheDocument()
    // Verify the excluded org is not shown
    expect(screen.queryByText('Other Corp')).not.toBeInTheDocument()
  })

  it('renders org list when user belongs to multiple orgs', async () => {
    mockOrgGet(twoOrgs)
    // User belongs to both orgs
    vi.spyOn(useUserProfileModule, 'useUserProfile').mockReturnValue({
      data: { ...userBelongsToOrg1, organizationIds: ['org-1', 'org-2'] },
      isLoading: false,
      isError: false,
      error: null,
    } as any)
    renderWithProviders(<OrgPickerPage />)
    await waitFor(() => {
      expect(screen.getByTestId('org-list')).toBeInTheDocument()
    })
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Globex Corp')).toBeInTheDocument()
  })

  it('auto-selects when user has access to only one org', async () => {
    mockOrgGet(twoOrgs)
    // User only belongs to org-1
    vi.spyOn(useUserProfileModule, 'useUserProfile').mockReturnValue({
      data: userBelongsToOrg1,
      isLoading: false,
      isError: false,
      error: null,
    } as any)
    renderWithProviders(<OrgPickerPage />)
    await waitFor(() => {
      expect(useAppStore.getState().selectedOrgId).toBe('org-1')
    })
  })

  it('stores selectedOrgId on org selection', async () => {
    mockOrgGet(twoOrgs)
    // User belongs to both orgs
    vi.spyOn(useUserProfileModule, 'useUserProfile').mockReturnValue({
      data: { ...userBelongsToOrg1, organizationIds: ['org-1', 'org-2'] },
      isLoading: false,
      isError: false,
      error: null,
    } as any)
    renderWithProviders(<OrgPickerPage />)
    await waitFor(() => {
      expect(screen.getByTestId('org-list')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId('org-item-org-2'))
    expect(useAppStore.getState().selectedOrgId).toBe('org-2')
  })

  it('shows no-orgs message when user has no organizations', async () => {
    mockOrgGet(twoOrgs)
    // User belongs to no organizations
    vi.spyOn(useUserProfileModule, 'useUserProfile').mockReturnValue({
      data: { ...userBelongsToOrg1, organizationIds: [] },
      isLoading: false,
      isError: false,
      error: null,
    } as any)
    renderWithProviders(<OrgPickerPage />)
    await waitFor(() => {
      expect(screen.getByTestId('no-orgs-message')).toBeInTheDocument()
    })
  })
})
