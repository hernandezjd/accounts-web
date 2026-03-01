import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { AccountingPage } from './AccountingPage'
import type { PeriodAccountSummary } from '@/types/accounting'

// ─── Mock the API hook ────────────────────────────────────────────────────────

vi.mock('@/hooks/api/usePeriodAccountSummary', () => ({
  usePeriodAccountSummary: vi.fn(),
}))

import { usePeriodAccountSummary } from '@/hooks/api/usePeriodAccountSummary'
const mockUseQuery = vi.mocked(usePeriodAccountSummary)

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleSummary: PeriodAccountSummary = {
  fromDate: '2026-01-01',
  toDate: '2026-01-31',
  accounts: [
    {
      accountId: 'acc-1',
      accountCode: '1000',
      accountName: 'Cash',
      level: 1,
      openingBalance: 1000,
      totalDebits: 500,
      totalCredits: 200,
      closingBalance: 1300,
      children: [],
      thirdPartyChildren: [],
    },
  ],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AccountingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state while fetching', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)

    renderWithProviders(<AccountingPage />, {
      routerProps: { initialEntries: ['/tenants/tenant-1/accounting'] },
    })

    expect(screen.getByText(/loading account data/i)).toBeInTheDocument()
  })

  it('shows error state when query fails', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('fetch failed'),
    } as ReturnType<typeof usePeriodAccountSummary>)

    renderWithProviders(<AccountingPage />, {
      routerProps: { initialEntries: ['/tenants/tenant-1/accounting'] },
    })

    expect(screen.getByText(/failed to load account data/i)).toBeInTheDocument()
  })

  it('renders tree when data is returned', async () => {
    mockUseQuery.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)

    renderWithProviders(<AccountingPage />, {
      routerProps: { initialEntries: ['/tenants/tenant-1/accounting'] },
    })

    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument()
      expect(screen.getByText('1000')).toBeInTheDocument()
    })
  })

  it('reads from URL search params when provided', () => {
    mockUseQuery.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)

    renderWithProviders(<AccountingPage />, {
      routerProps: {
        initialEntries: ['/tenants/tenant-1/accounting?from=2026-03-01&to=2026-03-31&granularity=monthly&level=2'],
      },
    })

    // Should use the period from URL; March 2026 label should be visible
    expect(screen.getByText('March 2026')).toBeInTheDocument()
  })

  it('default period (no URL params) shows current month period', () => {
    // Freeze time to 2026-03-15 via vitest fake timers
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15'))

    mockUseQuery.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)

    renderWithProviders(<AccountingPage />, {
      routerProps: { initialEntries: ['/tenants/tenant-1/accounting'] },
    })

    // Current month
    expect(screen.getByText('March 2026')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('ArrowLeft keyboard shortcut navigates to previous period', async () => {
    mockUseQuery.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)

    renderWithProviders(<AccountingPage />, {
      routerProps: {
        initialEntries: ['/tenants/tenant-1/accounting?from=2026-03-01&to=2026-03-31&granularity=monthly'],
      },
    })

    // Should show March 2026 initially
    expect(screen.getByText('March 2026')).toBeInTheDocument()

    // Press ArrowLeft
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    await waitFor(() => {
      expect(screen.getByText('February 2026')).toBeInTheDocument()
    })
  })

  it('ArrowRight keyboard shortcut navigates to next period', async () => {
    mockUseQuery.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)

    renderWithProviders(<AccountingPage />, {
      routerProps: {
        initialEntries: ['/tenants/tenant-1/accounting?from=2026-03-01&to=2026-03-31&granularity=monthly'],
      },
    })

    expect(screen.getByText('March 2026')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowRight' })

    await waitFor(() => {
      expect(screen.getByText('April 2026')).toBeInTheDocument()
    })
  })
})
