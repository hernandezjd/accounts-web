import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { TransactionsPage } from './TransactionsPage'
import type { Transaction, TransactionPage } from '@/hooks/api/useTransactions'
import type { Account } from '@/hooks/api/useAccounts'
import { getDefaultPeriod } from '@/utils/period'
import { PREFERENCE_KEYS } from '@/utils/preferences'

// ─── Mock hooks ─────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useParams: vi.fn().mockReturnValue({ workspaceId: 'workspace-test' }) }
})

vi.mock('@/hooks/api/useTransactions', () => ({
  useTransactions: vi.fn(),
}))
vi.mock('@/hooks/api/useTransactionTypes', () => ({
  useTransactionTypes: vi.fn(),
}))
vi.mock('@/hooks/api/useAccounts', () => ({
  useAccounts: vi.fn(),
}))
vi.mock('@/hooks/api/useWorkspaceConfig', () => ({
  useWorkspaceConfig: vi.fn(),
}))

// Mock the inline form to avoid setting up all its sub-hooks
vi.mock('../accounting/TransactionForm', () => ({
  TransactionForm: ({
    mode,
    onCancel,
  }: {
    mode: string
    onCancel: () => void
  }) => (
    <div data-testid="transaction-form">
      <span data-testid="form-mode">{mode === 'create' ? 'New Transaction Form' : 'Edit Transaction Form'}</span>
      <button onClick={onCancel} data-testid="form-cancel">
        Cancel Form
      </button>
    </div>
  ),
}))

import { useTransactions } from '@/hooks/api/useTransactions'
import { useTransactionTypes } from '@/hooks/api/useTransactionTypes'
import { useAccounts } from '@/hooks/api/useAccounts'
import { useWorkspaceConfig } from '@/hooks/api/useWorkspaceConfig'

const mockUseTransactions = vi.mocked(useTransactions)
const mockUseTransactionTypes = vi.mocked(useTransactionTypes)
const mockUseAccounts = vi.mocked(useAccounts)
const mockUseWorkspaceConfig = vi.mocked(useWorkspaceConfig)

// ─── Sample data ─────────────────────────────────────────────────────────────

const sampleAccounts: Account[] = [
  {
    id: 'acc-1',
    code: '100',
    name: 'Assets',
    level: 1,
    parentId: null,
    hasThirdParties: false,
    hasChildren: false,
  },
]

function pageOf(content: Transaction[], totalElements = content.length, page = 0, size = 50): TransactionPage {
  return {
    content,
    page,
    size,
    totalElements,
    totalPages: Math.ceil(totalElements / size),
  }
}

const sampleTransactions: Transaction[] = [
  {
    id: 'txn-1',
    date: '2024-01-15',
    transactionTypeId: 'tt-1',
    transactionTypeName: 'Journal Entry',
    transactionNumber: 'JE-001',
    description: 'Opening entries',
    items: [
      {
        accountId: 'acc-1',
        accountCode: '100',
        accountName: 'Assets',
        debitAmount: 1000,
        creditAmount: 0,
        thirdPartyId: null,
        thirdPartyName: null,
      },
    ],
  },
]

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()

  mockUseTransactions.mockReturnValue({
    data: pageOf(sampleTransactions),
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useTransactions>)

  mockUseTransactionTypes.mockReturnValue({
    data: [{ id: 'tt-1', name: 'Journal Entry' }],
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useTransactionTypes>)

  mockUseAccounts.mockReturnValue({
    data: sampleAccounts,
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useAccounts>)

  mockUseWorkspaceConfig.mockReturnValue({
    data: { systemInitialDate: '2024-01-01', lockedPeriodDate: null },
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useWorkspaceConfig>)
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TransactionsPage', () => {
  it('renders filter bar inputs', () => {
    renderWithProviders(<TransactionsPage />)

    expect(screen.getByTestId('filter-date-from')).toBeInTheDocument()
    expect(screen.getByTestId('filter-date-to')).toBeInTheDocument()
    expect(screen.getByTestId('apply-filters-btn')).toBeInTheDocument()
    expect(screen.getByTestId('clear-filters-btn')).toBeInTheDocument()
  })

  it('renders transaction table headers', () => {
    renderWithProviders(<TransactionsPage />)

    expect(screen.getByTestId('transactions-table')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Number')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Debit')).toBeInTheDocument()
    expect(screen.getByText('Credit')).toBeInTheDocument()
  })

  it('renders transaction rows', () => {
    renderWithProviders(<TransactionsPage />)

    expect(screen.getByTestId('txn-row-txn-1')).toBeInTheDocument()
    expect(screen.getByText('2024-01-15')).toBeInTheDocument()
    expect(screen.getByText('JE-001')).toBeInTheDocument()
    expect(screen.getByText('Opening entries')).toBeInTheDocument()
  })

  it('displays all transaction line items expanded', () => {
    renderWithProviders(<TransactionsPage />)

    // Verify line item account code and name are visible
    expect(screen.getByText(/100 Assets/)).toBeInTheDocument()
    // Verify debit amount is shown (both in transaction summary and line item)
    const debitAmounts = screen.getAllByText('1,000.00')
    expect(debitAmounts.length).toBeGreaterThanOrEqual(1)
  })

  it('displays line items with multiple items in a transaction', () => {
    const multiItemTransaction: Transaction = {
      id: 'txn-2',
      date: '2024-01-16',
      transactionTypeId: 'tt-1',
      transactionTypeName: 'Journal Entry',
      transactionNumber: 'JE-002',
      description: 'Multi-item transaction',
      items: [
        {
          accountId: 'acc-1',
          accountCode: '100',
          accountName: 'Assets',
          debitAmount: 500,
          creditAmount: 0,
          thirdPartyId: null,
          thirdPartyName: null,
        },
        {
          accountId: 'acc-2',
          accountCode: '200',
          accountName: 'Liabilities',
          debitAmount: 0,
          creditAmount: 500,
          thirdPartyId: null,
          thirdPartyName: null,
        },
      ],
    }

    mockUseTransactions.mockReturnValue({
      data: pageOf([multiItemTransaction]),
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactions>)

    renderWithProviders(<TransactionsPage />)

    // Both line items should be visible
    expect(screen.getByText(/100 Assets/)).toBeInTheDocument()
    expect(screen.getByText(/200 Liabilities/)).toBeInTheDocument()
    // Amounts should be visible (multiple occurrences of 500.00)
    const amounts = screen.getAllByText('500.00')
    expect(amounts.length).toBeGreaterThanOrEqual(2)
  })

  it('"New Transaction" button shows inline create form', async () => {
    renderWithProviders(<TransactionsPage />)

    await userEvent.click(screen.getByTestId('new-transaction-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('transaction-form')).toBeInTheDocument()
      expect(screen.getByTestId('form-mode')).toHaveTextContent('New Transaction Form')
    })
  })

  it('hides "New Transaction" button while form is open', async () => {
    renderWithProviders(<TransactionsPage />)

    await userEvent.click(screen.getByTestId('new-transaction-btn'))

    await waitFor(() => {
      expect(screen.queryByTestId('new-transaction-btn')).not.toBeInTheDocument()
    })
  })

  it('Edit button shows inline edit form', async () => {
    renderWithProviders(<TransactionsPage />)

    await userEvent.click(screen.getByTestId('edit-txn-txn-1'))

    await waitFor(() => {
      expect(screen.getByTestId('transaction-form')).toBeInTheDocument()
      expect(screen.getByTestId('form-mode')).toHaveTextContent('Edit Transaction Form')
    })
  })

  it('cancelling inline form restores "New Transaction" button', async () => {
    renderWithProviders(<TransactionsPage />)

    await userEvent.click(screen.getByTestId('new-transaction-btn'))
    await waitFor(() => screen.getByTestId('transaction-form'))
    await userEvent.click(screen.getByTestId('form-cancel'))

    await waitFor(() => {
      expect(screen.getByTestId('new-transaction-btn')).toBeInTheDocument()
    })
  })

  it('shows loading state while fetching', () => {
    mockUseTransactions.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactions>)

    renderWithProviders(<TransactionsPage />)

    expect(screen.getByText(/loading transactions/i)).toBeInTheDocument()
  })

  it('shows empty state when no transactions', () => {
    mockUseTransactions.mockReturnValue({
      data: pageOf([]),
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactions>)

    renderWithProviders(<TransactionsPage />)

    expect(screen.getByText(/no transactions found/i)).toBeInTheDocument()
  })
})

describe('TransactionsPage date range and pagination', () => {
  it('opens on the current Accounting period when nothing is stored', () => {
    renderWithProviders(<TransactionsPage />)

    const { from, to } = getDefaultPeriod('monthly')
    expect(mockUseTransactions).toHaveBeenLastCalledWith(
      'workspace-test',
      { dateFrom: from, dateTo: to },
      { page: 0, size: 50 },
    )
    expect(screen.getByTestId('filter-date-from')).toHaveValue(from)
    expect(screen.getByTestId('filter-date-to')).toHaveValue(to)
  })

  it('opens on the period last selected in Accounting', () => {
    window.localStorage.setItem(PREFERENCE_KEYS.ACCOUNTING_PERIOD_FROM, JSON.stringify('2026-09-01'))
    window.localStorage.setItem(PREFERENCE_KEYS.ACCOUNTING_PERIOD_TO, JSON.stringify('2026-09-30'))

    renderWithProviders(<TransactionsPage />)

    expect(mockUseTransactions).toHaveBeenLastCalledWith(
      'workspace-test',
      { dateFrom: '2026-09-01', dateTo: '2026-09-30' },
      { page: 0, size: 50 },
    )
  })

  it('shows the total count and requests the next page', async () => {
    mockUseTransactions.mockReturnValue({
      data: pageOf(sampleTransactions, 120),
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactions>)

    renderWithProviders(<TransactionsPage />)

    expect(screen.getByText('1–50 of 120')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /next page/i }))

    await waitFor(() => {
      expect(mockUseTransactions).toHaveBeenLastCalledWith(
        'workspace-test',
        expect.any(Object),
        { page: 1, size: 50 },
      )
    })
  })

  it('returns to the first page when filters are applied', async () => {
    mockUseTransactions.mockReturnValue({
      data: pageOf(sampleTransactions, 120),
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactions>)

    renderWithProviders(<TransactionsPage />)

    await userEvent.click(screen.getByRole('button', { name: /next page/i }))
    await waitFor(() => expect(mockUseTransactions).toHaveBeenLastCalledWith(
      'workspace-test', expect.any(Object), { page: 1, size: 50 },
    ))

    await userEvent.click(screen.getByTestId('apply-filters-btn'))

    await waitFor(() => expect(mockUseTransactions).toHaveBeenLastCalledWith(
      'workspace-test', expect.any(Object), { page: 0, size: 50 },
    ))
  })

  it('clearing filters requests all transactions without a date range', async () => {
    renderWithProviders(<TransactionsPage />)

    await userEvent.click(screen.getByTestId('clear-filters-btn'))

    await waitFor(() => expect(mockUseTransactions).toHaveBeenLastCalledWith(
      'workspace-test', {}, { page: 0, size: 50 },
    ))
  })
})
