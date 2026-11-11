import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { TransactionList } from './TransactionList'
import type { Transaction, TransactionPage } from '@/hooks/api/useTransactions'
import type { Account } from '@/hooks/api/useAccounts'
import { useCurrencyViewStore } from '@/store/currencyViewStore'

// ─── Mock hooks ─────────────────────────────────────────────────────────────

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
vi.mock('./TransactionForm', () => ({
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

const onAccountSelect = vi.fn()
const journalProps = {
  workspaceId: 'workspace-test',
  from: '2026-09-01',
  to: '2026-09-30',
  onAccountSelect,
  onClearAccount: vi.fn(),
}

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

describe('TransactionList without an account', () => {
  it('renders the account picker and the type filter, and no date inputs', () => {
    renderWithProviders(<TransactionList {...journalProps} />)

    expect(screen.getByTestId('journal-account-picker')).toBeInTheDocument()
    expect(screen.getByTestId('journal-type-filter')).toBeInTheDocument()
    expect(screen.queryByTestId('filter-date-from')).not.toBeInTheDocument()
    expect(screen.queryByTestId('apply-filters-btn')).not.toBeInTheDocument()
  })

  it('renders transaction table headers', () => {
    renderWithProviders(<TransactionList {...journalProps} />)

    expect(screen.getByTestId('transactions-table')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Number')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Debit')).toBeInTheDocument()
    expect(screen.getByText('Credit')).toBeInTheDocument()
  })

  it('renders transaction rows', () => {
    renderWithProviders(<TransactionList {...journalProps} />)

    expect(screen.getByTestId('txn-row-txn-1')).toBeInTheDocument()
    expect(screen.getByText('2024-01-15')).toBeInTheDocument()
    expect(screen.getByText('JE-001')).toBeInTheDocument()
    expect(screen.getByText('Opening entries')).toBeInTheDocument()
  })

  it('displays all transaction line items expanded', () => {
    renderWithProviders(<TransactionList {...journalProps} />)

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

    renderWithProviders(<TransactionList {...journalProps} />)

    // Both line items should be visible
    expect(screen.getByText(/100 Assets/)).toBeInTheDocument()
    expect(screen.getByText(/200 Liabilities/)).toBeInTheDocument()
    // Amounts should be visible (multiple occurrences of 500.00)
    const amounts = screen.getAllByText('500.00')
    expect(amounts.length).toBeGreaterThanOrEqual(2)
  })

  it('shows a foreign currency item in base currency with the original amount and readable rate below', () => {
    mockUseWorkspaceConfig.mockReturnValue({
      data: { systemInitialDate: '2024-01-01', lockedPeriodDate: null, baseCurrency: 'CAD' },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useWorkspaceConfig>)
    const foreignTransaction: Transaction = {
      id: 'txn-3',
      date: '2024-01-17',
      transactionTypeId: 'tt-1',
      transactionTypeName: 'Journal Entry',
      transactionNumber: 'JE-003',
      description: 'Payment in pesos',
      valuation: { mode: 'CLIENT_RATES', rates: [{ currency: 'COP', rate: 0.00043698081217 }] },
      items: [
        {
          accountId: 'acc-1',
          accountCode: '519515',
          accountName: 'Expenses',
          debitAmount: 218.49,
          creditAmount: 0,
          currency: 'CAD',
        },
        {
          accountId: 'acc-2',
          accountCode: '111014',
          accountName: 'Bank',
          debitAmount: 0,
          creditAmount: 500000,
          currency: 'COP',
          equivalents: [{ currency: 'CAD', amount: 218.49, roundingAdjustment: 0 }],
        },
      ],
    }
    mockUseTransactions.mockReturnValue({
      data: pageOf([foreignTransaction]),
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactions>)

    renderWithProviders(<TransactionList {...journalProps} />)

    expect(screen.getByText('Debit (CAD)')).toBeInTheDocument()
    expect(screen.getByText('Credit (CAD)')).toBeInTheDocument()
    // Transaction debit and credit totals, the debit item and the base equivalent of the credit item
    expect(screen.getAllByText('218.49')).toHaveLength(4)
    // The stored rate, 0.00043698081217 CAD per 1 COP, is shown as 1 / rate. The decimals of COP depend on the Intl
    // data of the runtime.
    expect(screen.getByTestId('item-original-amount')).toHaveTextContent(
      /^500,000(\.00)? COP ·\s1 CAD = 2,288\.43 COP$/,
    )
  })

  it('shows the rate only on the last item that shares it', () => {
    mockUseWorkspaceConfig.mockReturnValue({
      data: { systemInitialDate: '2024-01-01', lockedPeriodDate: null, baseCurrency: 'CAD' },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useWorkspaceConfig>)
    const item = (accountCode: string, debitAmount: number, creditAmount: number, equivalent: number) => ({
      accountId: `acc-${accountCode}`,
      accountCode,
      accountName: 'Account',
      debitAmount,
      creditAmount,
      currency: 'COP',
      equivalents: [{ currency: 'CAD', amount: equivalent, roundingAdjustment: 0 }],
    })
    mockUseTransactions.mockReturnValue({
      data: pageOf([
        {
          id: 'txn-4',
          date: '2024-01-18',
          transactionTypeId: 'tt-1',
          transactionTypeName: 'Journal Entry',
          transactionNumber: 'JE-004',
          description: 'Rent in pesos',
          // 597,000 COP = 260.92 CAD, split in two items of 298,500 COP = 130.46 CAD
          items: [item('111014', 597000, 0, 260.92), item('429518', 0, 298500, 130.46), item('238016', 0, 298500, 130.46)],
        },
      ]),
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactions>)

    renderWithProviders(<TransactionList {...journalProps} />)

    const notes = screen.getAllByTestId('item-original-amount')
    // The first item shares the rate but not the amounts, so it keeps its original amount without the rate
    expect(notes[0]).toHaveTextContent(/^597,000(\.00)? COP$/)
    // The last two items repeat the same amounts: only the last one shows the note and the rate
    expect(notes).toHaveLength(2)
    expect(notes[1]).toHaveTextContent(/^298,500(\.00)? COP · 1 CAD = 2,288\.0576 COP$/)
    // Both credit items still show their base amount
    expect(screen.getAllByText('130.46')).toHaveLength(2)
  })

  it('lists in the chosen currency and shows a dash where a line has no stored equivalent', () => {
    mockUseWorkspaceConfig.mockReturnValue({
      data: { systemInitialDate: '2024-01-01', lockedPeriodDate: null, baseCurrency: 'CAD' },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useWorkspaceConfig>)
    mockUseTransactions.mockReturnValue({
      data: pageOf([
        {
          id: 'txn-usd',
          date: '2024-01-20',
          transactionTypeId: 'tt-1',
          transactionTypeName: 'Journal Entry',
          transactionNumber: 'JE-005',
          description: 'Only CAD and COP stored',
          items: [
            {
              accountId: 'acc-cop',
              accountCode: '111014',
              accountName: 'Bank COP',
              debitAmount: 500000,
              creditAmount: 0,
              currency: 'COP',
              equivalents: [{ currency: 'CAD', amount: 218.49, roundingAdjustment: 0 }],
            },
            {
              accountId: 'acc-cad',
              accountCode: '111015',
              accountName: 'Bank CAD',
              debitAmount: 0,
              creditAmount: 218.49,
              currency: 'CAD',
              equivalents: [],
            },
          ],
        },
      ]),
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactions>)
    useCurrencyViewStore.setState({ view: { currency: 'USD' } })

    try {
      renderWithProviders(<TransactionList {...journalProps} />)

      expect(screen.getByText('Debit (USD)')).toBeInTheDocument()
      // Neither line has a stored USD equivalent, so both show a dash and the totals stay empty
      expect(screen.getAllByText('—')).toHaveLength(2)
      expect(screen.queryByText('218.49')).not.toBeInTheDocument()
    } finally {
      useCurrencyViewStore.setState({ view: { currency: null } })
    }
  })

  it('"New Transaction" button shows inline create form', async () => {
    renderWithProviders(<TransactionList {...journalProps} />)

    await userEvent.click(screen.getByTestId('new-transaction-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('transaction-form')).toBeInTheDocument()
      expect(screen.getByTestId('form-mode')).toHaveTextContent('New Transaction Form')
    })
  })

  it('keeps the list in place behind the form', async () => {
    renderWithProviders(<TransactionList {...journalProps} />)

    await userEvent.click(screen.getByTestId('new-transaction-btn'))

    await waitFor(() => expect(screen.getByTestId('transaction-form')).toBeInTheDocument())
    expect(screen.getByTestId('txn-row-txn-1')).toBeInTheDocument()
  })

  it('asks for confirmation before deleting a transaction', async () => {
    renderWithProviders(<TransactionList {...journalProps} />)

    await userEvent.click(screen.getByTestId('delete-txn-txn-1'))

    expect(await screen.findByTestId('confirm-delete-btn')).toBeInTheDocument()
  })

  it('Edit button shows inline edit form', async () => {
    renderWithProviders(<TransactionList {...journalProps} />)

    await userEvent.click(screen.getByTestId('edit-txn-txn-1'))

    await waitFor(() => {
      expect(screen.getByTestId('transaction-form')).toBeInTheDocument()
      expect(screen.getByTestId('form-mode')).toHaveTextContent('Edit Transaction Form')
    })
  })

  it('cancelling the form closes it', async () => {
    renderWithProviders(<TransactionList {...journalProps} />)

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

    renderWithProviders(<TransactionList {...journalProps} />)

    expect(screen.getByText(/loading transactions/i)).toBeInTheDocument()
  })

  it('shows empty state when no transactions', () => {
    mockUseTransactions.mockReturnValue({
      data: pageOf([]),
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactions>)

    renderWithProviders(<TransactionList {...journalProps} />)

    expect(screen.getByText(/no transactions in this period/i)).toBeInTheDocument()
  })
})

describe('TransactionList without an account period, filters and pagination', () => {
  it('requests the transactions of the period it is given', () => {
    renderWithProviders(<TransactionList {...journalProps} />)

    expect(mockUseTransactions).toHaveBeenLastCalledWith(
      'workspace-test',
      { dateFrom: '2026-09-01', dateTo: '2026-09-30' },
      { page: 0, size: 50 },
    )
  })

  it('applies the type filter at once', async () => {
    renderWithProviders(<TransactionList {...journalProps} />)

    await userEvent.click(within(screen.getByTestId('journal-type-filter')).getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Journal Entry' }))

    await waitFor(() => expect(mockUseTransactions).toHaveBeenLastCalledWith(
      'workspace-test',
      { dateFrom: '2026-09-01', dateTo: '2026-09-30', transactionTypeId: 'tt-1' },
      { page: 0, size: 50 },
    ))
  })

  it('reports the account picked in the account picker', async () => {
    renderWithProviders(<TransactionList {...journalProps} />)

    await userEvent.click(within(screen.getByTestId('journal-account-picker')).getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: /100 — Assets/ }))

    expect(onAccountSelect).toHaveBeenCalledWith('acc-1')
  })

  it('reports the account clicked in a transaction item', async () => {
    renderWithProviders(<TransactionList {...journalProps} />)

    await userEvent.click(screen.getByTestId('item-account-txn-1-0'))

    expect(onAccountSelect).toHaveBeenCalledWith('acc-1')
  })

  it('shows the total count and requests the next page', async () => {
    mockUseTransactions.mockReturnValue({
      data: pageOf(sampleTransactions, 120),
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactions>)

    renderWithProviders(<TransactionList {...journalProps} />)

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

  it('returns to the first page when the period changes', async () => {
    mockUseTransactions.mockReturnValue({
      data: pageOf(sampleTransactions, 120),
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactions>)

    const { rerender } = renderWithProviders(<TransactionList {...journalProps} />)

    await userEvent.click(screen.getByRole('button', { name: /next page/i }))
    await waitFor(() => expect(mockUseTransactions).toHaveBeenLastCalledWith(
      'workspace-test', expect.any(Object), { page: 1, size: 50 },
    ))

    rerender(<TransactionList {...journalProps} from="2026-10-01" to="2026-10-31" />)

    await waitFor(() => expect(mockUseTransactions).toHaveBeenLastCalledWith(
      'workspace-test',
      { dateFrom: '2026-10-01', dateTo: '2026-10-31' },
      { page: 0, size: 50 },
    ))
  })
})
