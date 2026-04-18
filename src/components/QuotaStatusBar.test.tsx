import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { QuotaStatusBar } from './QuotaStatusBar'
import { useAppStore } from '@/store/appStore'

vi.mock('@/api/apiClient', () => ({
  apiClient: {
    subscription: { GET: vi.fn() },
  },
}))

import { apiClient } from '@/api/apiClient'

type MockSubscriptionClient = { GET: ReturnType<typeof vi.fn> }

const mockSubscription = {
  id: 'sub-1',
  organizationId: 'org-1',
  planId: 'plan-1',
  plan: { id: 'plan-1', name: 'Free Trial', description: 'Trial', features: {}, quotas: { maxUsers: 5, maxTransactionsPerMonth: 100 } },
  status: 'ACTIVE',
  startDate: '2026-04-01T00:00:00Z',
  expirationDate: '2026-05-01T00:00:00Z',
  autoRenew: false,
  createdAt: '2026-04-01T00:00:00Z',
  modifiedAt: '2026-04-01T00:00:00Z',
}

const mockQuota = {
  organizationId: 'org-1',
  planId: 'plan-1',
  activeUsers: 3,
  maxUsers: 5,
  usersPercentage: 60,
  transactionsThisMonth: 50,
  maxTransactionsPerMonth: 100,
  transactionsPercentage: 50,
  apiCallsThisMonth: 100,
  apiRateLimit: 300,
  apiCallsPercentage: 33.3,
  lastResetDate: '2026-04-01T00:00:00Z',
}

function mockApis(subscription: unknown, quota: unknown) {
  vi.mocked((apiClient.subscription as unknown as MockSubscriptionClient).GET).mockImplementation(
    (url: string) => {
      if (url === '/subscriptions/organization/{orgId}')
        return Promise.resolve({ data: subscription, response: new Response() })
      if (url === '/quotas/organization/{orgId}')
        return Promise.resolve({ data: quota, response: new Response() })
      return Promise.resolve({ data: undefined, response: new Response() })
    },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useAppStore.setState({ selectedOrgId: null })
})

describe('QuotaStatusBar', () => {
  it('renders nothing when no selectedOrgId', () => {
    mockApis(mockSubscription, mockQuota)
    const { container } = renderWithProviders(<QuotaStatusBar />)
    expect(container.firstChild).toBeNull()
  })

  it('renders plan name and expiration date when data loads', async () => {
    useAppStore.setState({ selectedOrgId: 'org-1' })
    mockApis(mockSubscription, mockQuota)
    renderWithProviders(<QuotaStatusBar />)
    await waitFor(() => {
      expect(screen.getByTestId('quota-status-bar')).toBeInTheDocument()
    })
    expect(screen.getByText('Free Trial')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows user and transaction quota gauges', async () => {
    useAppStore.setState({ selectedOrgId: 'org-1' })
    mockApis(mockSubscription, mockQuota)
    renderWithProviders(<QuotaStatusBar />)
    await waitFor(() => {
      expect(screen.getByTestId('quota-status-bar')).toBeInTheDocument()
    })
    expect(screen.getByText(/Users: 3\/5/)).toBeInTheDocument()
    expect(screen.getByText(/Transactions: 50\/100/)).toBeInTheDocument()
  })

  it('hides Upgrade button when all quotas below 80%', async () => {
    useAppStore.setState({ selectedOrgId: 'org-1' })
    mockApis(mockSubscription, mockQuota)
    renderWithProviders(<QuotaStatusBar />)
    await waitFor(() => {
      expect(screen.getByTestId('quota-status-bar')).toBeInTheDocument()
    })
    expect(screen.queryByText('Upgrade')).not.toBeInTheDocument()
  })

  it('shows Upgrade button when users percentage >= 80', async () => {
    useAppStore.setState({ selectedOrgId: 'org-1' })
    mockApis(mockSubscription, { ...mockQuota, usersPercentage: 85 })
    renderWithProviders(<QuotaStatusBar />)
    await waitFor(() => {
      expect(screen.getByText('Upgrade')).toBeInTheDocument()
    })
  })

  it('shows Upgrade button when transactions percentage >= 80', async () => {
    useAppStore.setState({ selectedOrgId: 'org-1' })
    mockApis(mockSubscription, { ...mockQuota, transactionsPercentage: 90 })
    renderWithProviders(<QuotaStatusBar />)
    await waitFor(() => {
      expect(screen.getByText('Upgrade')).toBeInTheDocument()
    })
  })

  it('shows Unlimited when maxUsers is null', async () => {
    useAppStore.setState({ selectedOrgId: 'org-1' })
    mockApis(
      { ...mockSubscription, plan: { ...mockSubscription.plan, quotas: { maxUsers: null, maxTransactionsPerMonth: 100 } } },
      { ...mockQuota, maxUsers: null, usersPercentage: null },
    )
    renderWithProviders(<QuotaStatusBar />)
    await waitFor(() => {
      expect(screen.getByTestId('quota-status-bar')).toBeInTheDocument()
    })
    expect(screen.getByText(/Users: Unlimited/)).toBeInTheDocument()
  })

  it('renders nothing on API error', async () => {
    useAppStore.setState({ selectedOrgId: 'org-1' })
    vi.mocked((apiClient.subscription as unknown as MockSubscriptionClient).GET).mockRejectedValue(
      new Error('Network error'),
    )
    const { container } = renderWithProviders(<QuotaStatusBar />)
    // Wait briefly to let any async operations settle
    await new Promise((r) => setTimeout(r, 50))
    expect(container.querySelector('[data-testid="quota-status-bar"]')).toBeNull()
  })

  it('opens subscription-web URL when Upgrade is clicked', async () => {
    useAppStore.setState({ selectedOrgId: 'org-1' })
    mockApis(mockSubscription, { ...mockQuota, usersPercentage: 85 })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    renderWithProviders(<QuotaStatusBar />)
    await waitFor(() => {
      expect(screen.getByText('Upgrade')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByText('Upgrade'))
    expect(openSpy).toHaveBeenCalledWith(expect.any(String), '_blank')
    openSpy.mockRestore()
  })
})
