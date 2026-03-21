import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

vi.mock('@/hooks/api/useUnifiedSearch', () => ({
  useUnifiedSearch: vi.fn().mockReturnValue({ data: undefined, isLoading: false, isError: false }),
}))

vi.mock('@/hooks/api/useTenantConfig', () => ({
  useTenantConfig: vi.fn(),
}))

import { usePeriodAccountSummary } from '@/hooks/api/usePeriodAccountSummary'
import { useAccountTransactionsInPeriod } from '@/hooks/api/useAccountTransactionsInPeriod'
import { useUnifiedSearch } from '@/hooks/api/useUnifiedSearch'
import { useTenantConfig } from '@/hooks/api/useTenantConfig'
const mockUseSummary = vi.mocked(usePeriodAccountSummary)
const mockUseTxns = vi.mocked(useAccountTransactionsInPeriod)
const mockUseSearch = vi.mocked(useUnifiedSearch)
const mockUseTenantConfig = vi.mocked(useTenantConfig)

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
    localStorage.clear()
    mockUseTxns.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useUnifiedSearch>)
    mockUseTenantConfig.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useTenantConfig>)
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

    expect(screen.getByRole('alert')).toBeInTheDocument()
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
      // Transaction view shows the account name in the header (looking for h2 heading)
      expect(screen.getByRole('heading', { name: /1000 Cash/ })).toBeInTheDocument()
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
      // Verify transaction view header shows the account
      expect(screen.getByRole('heading', { name: /1000 Cash/ })).toBeInTheDocument()
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

  // ── Search integration ──────────────────────────────────────────────────────

  it('shouldShowSearchBar_inTreeView', () => {
    mockUseSummary.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)

    renderWithProviders(<AccountingPage />, {
      routerProps: { initialEntries: ['/tenants/tenant-1/accounting?from=2026-01-01&to=2026-01-31&granularity=monthly'] },
    })

    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shouldNotShowSearchBar_inTransactionView', async () => {
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
        initialEntries: [
          '/tenants/tenant-1/accounting?from=2026-01-01&to=2026-01-31&granularity=monthly&view=transactions&accountId=acc-1',
        ],
      },
    })

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  it('shouldExpandAncestorsAndHighlight_whenAccountResultSelected', async () => {
    const nestedSummary = {
      ...sampleSummary,
      accounts: [
        {
          accountId: 'acc-parent',
          accountCode: '1000',
          accountName: 'Assets',
          level: 1,
          openingBalance: 1000,
          totalDebits: 500,
          totalCredits: 200,
          closingBalance: 1300,
          thirdPartyChildren: [],
          children: [
            {
              accountId: 'acc-child',
              accountCode: '1100',
              accountName: 'Cash',
              level: 2,
              openingBalance: 500,
              totalDebits: 100,
              totalCredits: 50,
              closingBalance: 550,
              thirdPartyChildren: [],
              children: [],
            },
          ],
        },
      ],
    }

    mockUseSummary.mockReturnValue({
      data: nestedSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)

    mockUseSearch.mockReturnValue({
      data: {
        query: 'cash',
        accounts: [{ accountId: 'acc-child', accountCode: '1100', accountName: 'Cash', level: 2 }],
        transactions: [],
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useUnifiedSearch>)

    renderWithProviders(<AccountingPage />, {
      routerProps: { initialEntries: ['/tenants/tenant-1/accounting?from=2026-01-01&to=2026-01-31&granularity=monthly&level=1'] },
    })

    // Tree is at level 1 — only parent visible initially (level filter collapses children)
    await waitFor(() => expect(screen.getByText('Assets')).toBeInTheDocument())

    // Type in search
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'cash')

    // Click the Cash result in the popover
    await waitFor(() => {
      expect(screen.getAllByText('Cash').length).toBeGreaterThan(0)
    })

    // Click the one in the popover (list item)
    const cashItems = screen.getAllByText('Cash')
    fireEvent.click(cashItems[cashItems.length - 1])

    // Parent should now be expanded (Cash account visible in tree)
    await waitFor(() => {
      const cashRows = screen.getAllByText('Cash')
      expect(cashRows.length).toBeGreaterThan(0)
    })
  })

  it('shouldNavigateToTransactionView_whenTransactionResultSelected', async () => {
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

    mockUseSearch.mockReturnValue({
      data: {
        query: 'inv',
        accounts: [],
        transactions: [
          {
            transactionId: 'txn-1',
            transactionNumber: 'INV-001',
            transactionTypeName: 'Invoice',
            date: '2026-01-15',
            description: 'Test',
            items: [{ accountId: 'acc-1', accountCode: '1000', accountName: 'Cash', thirdPartyId: null, thirdPartyName: null, debitAmount: 100, creditAmount: 0 }],
          },
        ],
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useUnifiedSearch>)

    renderWithProviders(<AccountingPage />, {
      routerProps: { initialEntries: ['/tenants/tenant-1/accounting?from=2026-01-01&to=2026-01-31&granularity=monthly'] },
    })

    await waitFor(() => expect(screen.getByText('Cash')).toBeInTheDocument())

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'inv')

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('INV-001'))

    await waitFor(() => {
      // Should now be in transaction view (Back button visible)
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
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

  it('shows warning banner and keeps toggle OFF when closure config is missing', async () => {
    mockUseSummary.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)

    renderWithProviders(<AccountingPage />, {
      routerProps: { initialEntries: ['/tenants/tenant-1/accounting'] },
    })

    const toggle = screen.getByRole('checkbox', { name: /simulate closure/i })
    expect(toggle).not.toBeChecked()
    expect(screen.queryByTestId('simulation-missing-config-banner')).not.toBeInTheDocument()

    await userEvent.click(toggle)

    await waitFor(() => {
      expect(toggle).not.toBeChecked()
      expect(screen.getByTestId('simulation-missing-config-banner')).toBeInTheDocument()
      expect(screen.getByText(/requires nominal accounts and a P&L account/i)).toBeInTheDocument()
      expect(screen.getByTestId('missing-config-link')).toBeInTheDocument()
    })
  })

  it('shows warning when only nominal accounts are missing', async () => {
    mockUseSummary.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)
    mockUseTenantConfig.mockReturnValue({
      data: { nominalAccounts: [], profitLossAccountId: 'pnl-1' },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useTenantConfig>)

    renderWithProviders(<AccountingPage />, {
      routerProps: { initialEntries: ['/tenants/tenant-1/accounting'] },
    })

    const toggle = screen.getByRole('checkbox', { name: /simulate closure/i })
    await userEvent.click(toggle)

    await waitFor(() => {
      expect(toggle).not.toBeChecked()
      expect(screen.getByText(/requires nominal accounts to be configured/i)).toBeInTheDocument()
    })
  })

  it('shows warning when only P&L account is missing', async () => {
    mockUseSummary.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)
    mockUseTenantConfig.mockReturnValue({
      data: { nominalAccounts: ['acc-1'], profitLossAccountId: null },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useTenantConfig>)

    renderWithProviders(<AccountingPage />, {
      routerProps: { initialEntries: ['/tenants/tenant-1/accounting'] },
    })

    const toggle = screen.getByRole('checkbox', { name: /simulate closure/i })
    await userEvent.click(toggle)

    await waitFor(() => {
      expect(toggle).not.toBeChecked()
      expect(screen.getByText(/requires a P&L account to be configured/i)).toBeInTheDocument()
    })
  })

  it('shows info banner when closure config is complete', async () => {
    mockUseSummary.mockReturnValue({
      data: sampleSummary,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePeriodAccountSummary>)
    mockUseTenantConfig.mockReturnValue({
      data: { nominalAccounts: ['acc-1'], profitLossAccountId: 'pnl-1' },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useTenantConfig>)

    renderWithProviders(<AccountingPage />, {
      routerProps: { initialEntries: ['/tenants/tenant-1/accounting'] },
    })

    await userEvent.click(screen.getByRole('checkbox', { name: /simulate closure/i }))

    await waitFor(() => {
      expect(screen.getByTestId('simulation-active-banner')).toBeInTheDocument()
      expect(screen.getByText(/values shown in blue/i)).toBeInTheDocument()
    })
  })
})
