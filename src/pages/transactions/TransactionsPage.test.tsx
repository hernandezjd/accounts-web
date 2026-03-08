import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { TransactionsPage } from './TransactionsPage'
import type { Transaction } from '@/hooks/api/useTransactions'
import type { Account } from '@/hooks/api/useAccounts'

// ─── Mock hooks ─────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useParams: vi.fn().mockReturnValue({ tenantId: 'tenant-test' }) }
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
vi.mock('@/hooks/api/useTenantConfig', () => ({
  useTenantConfig: vi.fn(),
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
import { useTenantConfig } from '@/hooks/api/useTenantConfig'

const mockUseTransactions = vi.mocked(useTransactions)
const mockUseTransactionTypes = vi.mocked(useTransactionTypes)
const mockUseAccounts = vi.mocked(useAccounts)
const mockUseTenantConfig = vi.mocked(useTenantConfig)

// ─── Sample data ─────────────────────────────────────────────────────────────

const sampleAccounts: Account[] = [
  {
    id: 'acc-1',
    code: '100',
    name: 'Assets',
    level: 1,
    parentId: null,
    hasThirdParties: false,
    balance: 0,
    hasChildren: false,
  },
]

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

  mockUseTransactions.mockReturnValue({
    data: sampleTransactions,
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

  mockUseTenantConfig.mockReturnValue({
    data: { systemInitialDate: '2024-01-01', closedPeriodDate: null },
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useTenantConfig>)
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
    expect(screen.getByText('Items')).toBeInTheDocument()
  })

  it('renders transaction rows', () => {
    renderWithProviders(<TransactionsPage />)

    expect(screen.getByTestId('txn-row-txn-1')).toBeInTheDocument()
    expect(screen.getByText('2024-01-15')).toBeInTheDocument()
    expect(screen.getByText('JE-001')).toBeInTheDocument()
    expect(screen.getByText('Opening entries')).toBeInTheDocument()
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
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactions>)

    renderWithProviders(<TransactionsPage />)

    expect(screen.getByText(/no transactions found/i)).toBeInTheDocument()
  })
})
