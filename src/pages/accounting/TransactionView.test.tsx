import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { TransactionView } from './TransactionView'
import type { AccountTransactionDetail } from '@/types/accounting'

// ─── Mock the API hook ────────────────────────────────────────────────────────

vi.mock('@/hooks/api/useAccountTransactionsInPeriod', () => ({
  useAccountTransactionsInPeriod: vi.fn(),
}))

import { useAccountTransactionsInPeriod } from '@/hooks/api/useAccountTransactionsInPeriod'
const mockUseQuery = vi.mocked(useAccountTransactionsInPeriod)

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleData: AccountTransactionDetail = {
  accountId: 'acc-1',
  fromDate: '2026-01-01',
  toDate: '2026-01-31',
  thirdPartyId: null,
  openingBalance: 5000,
  transactions: [
    {
      transactionId: 'txn-1',
      transactionNumber: 'INV-001',
      transactionTypeName: 'Invoice',
      date: '2026-01-15',
      description: 'Office supplies',
      items: [
        {
          accountId: 'acc-1',
          accountCode: '1000',
          accountName: 'Cash',
          thirdPartyId: null,
          thirdPartyName: null,
          debitAmount: 100,
          creditAmount: 0,
        },
      ],
      runningBalance: 5100,
    },
  ],
}

const defaultProps = {
  tenantId: 'tenant-1',
  accountId: 'acc-1',
  accountName: 'Cash',
  accountCode: '1000',
  from: '2026-01-01',
  to: '2026-01-31',
  granularity: 'monthly' as const,
  onBack: vi.fn(),
  onPrevPeriod: vi.fn(),
  onNextPeriod: vi.fn(),
  onGranularityChange: vi.fn(),
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TransactionView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state while fetching', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    expect(screen.getByText(/loading transactions/i)).toBeInTheDocument()
  })

  it('renders opening balance and transaction table when data is loaded', async () => {
    mockUseQuery.mockReturnValue({
      data: sampleData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/opening balance/i)).toBeInTheDocument()
      expect(screen.getByText('5,000.00')).toBeInTheDocument()
    })
  })

  it('renders all table columns — date, type, number, description, debit, credit, balance', async () => {
    mockUseQuery.mockReturnValue({
      data: sampleData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('2026-01-15')).toBeInTheDocument()
      expect(screen.getByText('Invoice')).toBeInTheDocument()
      expect(screen.getByText('INV-001')).toBeInTheDocument()
      expect(screen.getByText('Office supplies')).toBeInTheDocument()
      expect(screen.getByText('100.00')).toBeInTheDocument()
      expect(screen.getByText('5,100.00')).toBeInTheDocument()
    })
  })

  it('shows no-transactions message when transaction list is empty', async () => {
    const emptyData: AccountTransactionDetail = {
      ...sampleData,
      transactions: [],
    }
    mockUseQuery.mockReturnValue({
      data: emptyData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/no transactions in this period/i)).toBeInTheDocument()
    })
  })

  it('calls onBack when back button is clicked', async () => {
    mockUseQuery.mockReturnValue({
      data: sampleData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    const onBack = vi.fn()
    renderWithProviders(<TransactionView {...defaultProps} onBack={onBack} />)

    await userEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('shows third-party name in header when thirdPartyId is provided', () => {
    mockUseQuery.mockReturnValue({
      data: sampleData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(
      <TransactionView
        {...defaultProps}
        thirdPartyId="tp-1"
        thirdPartyName="ACME Corp"
      />,
    )

    expect(screen.getByText(/ACME Corp/)).toBeInTheDocument()
  })
})
