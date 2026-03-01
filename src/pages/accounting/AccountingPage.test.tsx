import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { AccountingPage } from './AccountingPage'
import type { AccountTransactionDetail, PeriodAccountSummary } from '@/types/accounting'

// ─── Mock the API hooks ────────────────────────────────────────────────────────

vi.mock('@/hooks/api/usePeriodAccountSummary', () => ({
  usePeriodAccountSummary: vi.fn(),
}))

vi.mock('@/hooks/api/useAccountTransactionsInPeriod', () => ({
  useAccountTransactionsInPeriod: vi.fn(),
}))

import { usePeriodAccountSummary } from '@/hooks/api/usePeriodAccountSummary'
import { useAccountTransactionsInPeriod } from '@/hooks/api/useAccountTransactionsInPeriod'
const mockUseSummary = vi.mocked(usePeriodAccountSummary)
const mockUseTxns = vi.mocked(useAccountTransactionsInPeriod)

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
      thirdPartyChildren: [
        {
          thirdPartyId: 'tp-1',
          thirdPartyName: 'ACME Corp',
          thirdPartyExternalId: 'TAX-001',
          openingBalance: 500,
          totalDebits: 100,
          totalCredits: 0,
          closingBalance: 600,
        },
      ],
    },
  ],
}

const sampleTransactions: AccountTransactionDetail = {
  accountId: 'acc-1',
  fromDate: '2026-01-01',
  toDate: '2026-01-31',
  thirdPartyId: null,
  openingBalance: 1000,
  transactions: [
    {
      transactionId: 'txn-1',
      transactionNumber: 'INV-001',
      transactionTypeName: 'Invoice',
      date: '2026-01-10',
      description: 'Test transaction',
      items: [
        {
          accountId: 'acc-1',
          accountCode: '1000',
          accountName: 'Cash',
          thirdPartyId: null,
          thirdPartyName: null,
          debitAmount: 300,
          creditAmount: 0,
        },
      ],
      runningBalance: 1300,
    },
  ],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AccountingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTxns.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)
  })

  it('shows loading state while fetching', () => {
    mockUseSummary.mockReturnValue({
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
    mockUseSummary.mockReturnValue({
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
    mockUseSummary.mockReturnValue({
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
    mockUseSummary.mockReturnValue({
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

    mockUseSummary.mockReturnValue({
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
    mockUseSummary.mockReturnValue({
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
    mockUseSummary.mockReturnValue({
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

  // ── Drill-down and navigation history ──────────────────────────────────────

  it('double-click on account row switches to transaction view', async () => {
    mockUseSummary.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)
    mockUseTxns.mockReturnValue({
      data: sampleTransactions,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<AccountingPage />, {
      routerProps: { initialEntries: ['/tenants/tenant-1/accounting?from=2026-01-01&to=2026-01-31&granularity=monthly'] },
    })

    await waitFor(() => expect(screen.getByText('Cash')).toBeInTheDocument())

    const cashRow = screen.getByRole('row', { name: /1000 Cash/i })
    fireEvent.dblClick(cashRow)

    await waitFor(() => {
      // Transaction view shows the account name in the header
      expect(screen.getByText(/Cash/)).toBeInTheDocument()
      // Back button appears
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })

  it('transaction view shows account name in header', async () => {
    mockUseSummary.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)
    mockUseTxns.mockReturnValue({
      data: sampleTransactions,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    // Start directly in transaction view via URL
    renderWithProviders(<AccountingPage />, {
      routerProps: {
        initialEntries: [
          '/tenants/tenant-1/accounting?from=2026-01-01&to=2026-01-31&granularity=monthly&view=transactions&accountId=acc-1',
        ],
      },
    })

    await waitFor(() => {
      expect(screen.getByText(/Cash/)).toBeInTheDocument()
    })
  })

  it('back button in transaction view returns to tree view', async () => {
    mockUseSummary.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)
    mockUseTxns.mockReturnValue({
      data: sampleTransactions,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<AccountingPage />, {
      routerProps: {
        initialEntries: ['/tenants/tenant-1/accounting?from=2026-01-01&to=2026-01-31&granularity=monthly'],
      },
    })

    // Drill down
    await waitFor(() => expect(screen.getByText('Cash')).toBeInTheDocument())
    fireEvent.dblClick(screen.getByRole('row', { name: /1000 Cash/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    // Press Back
    fireEvent.click(screen.getByRole('button', { name: /back/i }))

    await waitFor(() => {
      // Should be back in tree view: tree headers visible, no back button
      expect(screen.getByText('Code')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
    })
  })

  it('Escape keyboard shortcut returns to tree view from transaction view', async () => {
    mockUseSummary.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)
    mockUseTxns.mockReturnValue({
      data: sampleTransactions,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<AccountingPage />, {
      routerProps: {
        initialEntries: ['/tenants/tenant-1/accounting?from=2026-01-01&to=2026-01-31&granularity=monthly'],
      },
    })

    // Drill down
    await waitFor(() => expect(screen.getByText('Cash')).toBeInTheDocument())
    fireEvent.dblClick(screen.getByRole('row', { name: /1000 Cash/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.getByText('Code')).toBeInTheDocument()
    })
  })

  it('TP row double-click passes thirdPartyId to transaction view', async () => {
    mockUseSummary.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)
    mockUseTxns.mockReturnValue({
      data: { ...sampleTransactions, thirdPartyId: 'tp-1' },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<AccountingPage />, {
      routerProps: {
        initialEntries: ['/tenants/tenant-1/accounting?from=2026-01-01&to=2026-01-31&granularity=monthly'],
      },
    })

    // With levelFilter=null, the Cash account is auto-expanded (it has thirdPartyChildren)
    await waitFor(() => {
      expect(screen.getByText('ACME Corp')).toBeInTheDocument()
    })

    // Double-click the TP row
    const tpRow = screen.getByRole('row', { name: /TAX-001 ACME Corp/i })
    fireEvent.dblClick(tpRow)

    await waitFor(() => {
      // Transaction view shows TP name in header
      expect(screen.getByText(/ACME Corp/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })
})
