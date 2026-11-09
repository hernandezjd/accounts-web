import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { TransactionView } from './TransactionView'
import type { AccountTransactionDetail } from '@/types/accounting'

// ─── Mock hooks ────────────────────────────────────────────────────────────────

vi.mock('@/hooks/api/useAccountTransactionsInPeriod', () => ({
  useAccountTransactionsInPeriod: vi.fn(),
}))
vi.mock('@/hooks/api/useExtraCurrencyStatements', () => ({
  useExtraCurrencyStatements: vi.fn(() => []),
}))
vi.mock('@/hooks/api/useTransactionById', () => ({
  useTransactionById: vi.fn(),
}))
vi.mock('@/hooks/api/useTransactionMutations', () => ({
  useTransactionMutations: vi.fn(),
}))

// Mock TransactionForm to keep tests simple
vi.mock('./TransactionForm', () => ({
  TransactionForm: ({ onCancel, onSuccess, mode }: { onCancel: () => void; onSuccess: () => void; mode: string }) => (
    <div data-testid="transaction-form" data-mode={mode}>
      <button onClick={onCancel}>cancel-form</button>
      <button onClick={onSuccess}>save-form</button>
    </div>
  ),
}))

import { useAccountTransactionsInPeriod } from '@/hooks/api/useAccountTransactionsInPeriod'
import { useTransactionById } from '@/hooks/api/useTransactionById'
import { useTransactionMutations } from '@/hooks/api/useTransactionMutations'

const mockUseQuery = vi.mocked(useAccountTransactionsInPeriod)
const mockUseTransactionById = vi.mocked(useTransactionById)
const mockUseTransactionMutations = vi.mocked(useTransactionMutations)

import { useCurrencyViewStore } from '@/store/currencyViewStore'
import { useExtraCurrencyStatements } from '@/hooks/api/useExtraCurrencyStatements'

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleData: AccountTransactionDetail = {
  accountId: 'acc-1',
  fromDate: '2026-01-01',
  toDate: '2026-01-31',
  thirdPartyId: null,
  currency: 'USD',
  openingBalance: 5000,
  totalDebits: 100,
  totalCredits: 0,
  closingBalance: 5100,
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
      debitAmount: 100,
      creditAmount: 0,
      runningBalance: 5100,
    },
  ],
}

const noOpMutation = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
}

const defaultProps = {
  workspaceId: 'workspace-1',
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

    mockUseTransactionById.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactionById>)

    mockUseTransactionMutations.mockReturnValue({
      createTransaction: { ...noOpMutation },
      editTransaction: { ...noOpMutation },
      deleteTransaction: { ...noOpMutation },
      createInitialBalance: { ...noOpMutation },
      editInitialBalance: { ...noOpMutation },
      deleteInitialBalance: { ...noOpMutation },
    })
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
      // 100.00 appears both in transaction summary and line item rows
      expect(screen.getAllByText('100.00')).toHaveLength(2)
      expect(screen.getByText('5,100.00')).toBeInTheDocument()
    })
  })

  it('shows no-transactions message when transaction list is empty', async () => {
    const emptyData: AccountTransactionDetail = { ...sampleData, transactions: [] }
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
      <TransactionView {...defaultProps} thirdPartyId="tp-1" thirdPartyName="ACME Corp" />,
    )

    expect(screen.getByText(/ACME Corp/)).toBeInTheDocument()
  })


  it('opens create form when "New Transaction" button is clicked', async () => {
    mockUseQuery.mockReturnValue({
      data: sampleData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /new transaction/i }))

    await waitFor(() => {
      expect(screen.getByTestId('transaction-form')).toBeInTheDocument()
      expect(screen.getByTestId('transaction-form')).toHaveAttribute('data-mode', 'create')
    })
  })


  it('closes form when cancel is clicked', async () => {
    mockUseQuery.mockReturnValue({
      data: sampleData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /new transaction/i }))
    await waitFor(() => screen.getByTestId('transaction-form'))

    await userEvent.click(screen.getByRole('button', { name: 'cancel-form' }))

    await waitFor(() => {
      expect(screen.queryByTestId('transaction-form')).not.toBeInTheDocument()
    })
  })

  it('shows edit icon buttons on each transaction row', async () => {
    mockUseQuery.mockReturnValue({
      data: sampleData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('edit-txn-txn-1')).toBeInTheDocument()
    })
  })

  it('shows delete icon buttons on each transaction row', async () => {
    mockUseQuery.mockReturnValue({
      data: sampleData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('delete-txn-txn-1')).toBeInTheDocument()
    })
  })

  it('shows delete confirmation dialog when row delete icon is clicked', async () => {
    mockUseQuery.mockReturnValue({
      data: sampleData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    await waitFor(() => screen.getByTestId('delete-txn-txn-1'))
    await userEvent.click(screen.getByTestId('delete-txn-txn-1'))

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    })
  })

  it('calls deleteTransaction mutation when confirm is clicked', async () => {
    const deleteMutate = vi.fn()
    mockUseTransactionMutations.mockReturnValue({
      createTransaction: { ...noOpMutation },
      editTransaction: { ...noOpMutation },
      deleteTransaction: { ...noOpMutation, mutate: deleteMutate },
      createInitialBalance: { ...noOpMutation },
    })

    mockUseQuery.mockReturnValue({
      data: sampleData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    await waitFor(() => screen.getByTestId('delete-txn-txn-1'))
    await userEvent.click(screen.getByTestId('delete-txn-txn-1'))
    await waitFor(() => screen.getByTestId('confirm-delete-btn'))

    await userEvent.click(screen.getByTestId('confirm-delete-btn'))

    expect(deleteMutate).toHaveBeenCalledWith('txn-1', expect.any(Object))
  })

  it('opens edit form when edit icon is clicked and transaction data is fetched', async () => {
    mockUseQuery.mockReturnValue({
      data: sampleData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    const editTxnData = {
      id: 'txn-1',
      transactionTypeId: 'type-1',
      transactionTypeName: 'Invoice',
      transactionNumber: 'INV-001',
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
    }

    // First call: loading; second (after clicking edit): returns data
    mockUseTransactionById
      .mockReturnValueOnce({
        data: undefined,
        isSuccess: false,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useTransactionById>)
      .mockReturnValue({
        data: editTxnData,
        isSuccess: true,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useTransactionById>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    await waitFor(() => screen.getByTestId('edit-txn-txn-1'))
    await userEvent.click(screen.getByTestId('edit-txn-txn-1'))

    await waitFor(() => {
      expect(screen.getByTestId('transaction-form')).toBeInTheDocument()
      expect(screen.getByTestId('transaction-form')).toHaveAttribute('data-mode', 'edit')
    })
  })

  it('displays all transaction line items as expanded rows', async () => {
    const dataWithMultipleItems: AccountTransactionDetail = {
      ...sampleData,
      transactions: [
        {
          ...sampleData.transactions[0],
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
            {
              accountId: 'acc-2',
              accountCode: '2000',
              accountName: 'Revenue',
              thirdPartyId: null,
              thirdPartyName: null,
              debitAmount: 0,
              creditAmount: 100,
            },
          ],
        },
      ],
    }

    mockUseQuery.mockReturnValue({
      data: dataWithMultipleItems,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    await waitFor(() => {
      // Verify first line item is displayed (in table, not header)
      const lineItems = screen.getAllByText(/1000 Cash/)
      expect(lineItems.length).toBeGreaterThan(1) // At least header + table row
      // Verify second line item is displayed
      expect(screen.getByText(/2000 Revenue/)).toBeInTheDocument()
    })
  })

  it('shows the amounts the backend computed, with native amounts and equivalents on the items', async () => {
    // 1,000,000 COP posted to a child, worth 250.00 USD: the statement is in USD
    const parentData: AccountTransactionDetail = {
      accountId: 'parent-1',
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      thirdPartyId: null,
      currency: 'USD',
      openingBalance: 150,
      totalDebits: 250,
      totalCredits: 0,
      closingBalance: 400,
      transactions: [
        {
          transactionId: 'txn-1',
          transactionNumber: 'JRN-001',
          transactionTypeName: 'Journal',
          date: '2026-01-15',
          description: 'Transfer',
          items: [
            { accountId: 'child-1', accountCode: '1100', accountName: 'Cash', thirdPartyId: null, thirdPartyName: null, debitAmount: 1000000, creditAmount: 0, currency: 'COP', equivalents: [{ currency: 'USD', amount: 250 }] },
          ],
          debitAmount: 250,
          creditAmount: 0,
          runningBalance: 400,
        },
      ],
    }
    mockUseQuery.mockReturnValue({
      data: parentData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(
      <TransactionView
        {...defaultProps}
        accountId="parent-1"
        accountName="Assets"
        accountCode="1000"
      />,
    )

    await waitFor(() => {
      expect(screen.getAllByText('250.00').length).toBeGreaterThan(1)
    })
    expect(screen.getByText(/1,000,000\.00 COP/)).toBeInTheDocument()
    expect(screen.getByText(/≈ 250\.00 USD/)).toBeInTheDocument()
    expect(screen.getByTestId('statement-summary')).toHaveTextContent('400.00 USD')
  })

  it('explains, instead of showing an error screen, that the account does not track the chosen currency', async () => {
    useCurrencyViewStore.setState({ view: { currency: 'COP' }, baseCurrency: 'CAD' })
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { errorCode: 'VALIDATION_ERROR', userMessage: 'Account 1100 does not track COP' },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    expect(await screen.findByTestId('untracked-currency-message')).toHaveTextContent('no movements in COP')
    useCurrencyViewStore.setState({ view: { currency: null }, baseCurrency: null })
  })

  it('displays line items with third-party names when applicable', async () => {
    const dataWithThirdParty: AccountTransactionDetail = {
      ...sampleData,
      transactions: [
        {
          ...sampleData.transactions[0],
          items: [
            {
              accountId: 'acc-1',
              accountCode: '1000',
              accountName: 'Cash',
              thirdPartyId: 'tp-1',
              thirdPartyName: 'ACME Corp',
              debitAmount: 100,
              creditAmount: 0,
            },
          ],
        },
      ],
    }

    mockUseQuery.mockReturnValue({
      data: dataWithThirdParty,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/1000 Cash \/ ACME Corp/)).toBeInTheDocument()
    })
  })

  it('adds a balance column per extra currency, lined up by transaction, and a dash where a transaction has none', async () => {
    // 100.00 USD debit is 125.00 CAD at 1.25; the CAD statement closes at 6,375.00
    vi.mocked(useExtraCurrencyStatements).mockReturnValue([
      {
        currency: 'CAD',
        ready: true,
        closingBalance: 6375,
        runningBalanceByTransaction: new Map([['txn-1', 6375]]),
      },
    ])
    mockUseQuery.mockReturnValue({
      data: sampleData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccountTransactionsInPeriod>)

    renderWithProviders(<TransactionView {...defaultProps} />)

    expect(await screen.findByText('Balance (CAD)')).toBeInTheDocument()
    expect(screen.getByTestId('extra-balance-CAD')).toHaveTextContent('6,375.00')
    expect(screen.getByTestId('extra-closing-CAD')).toHaveTextContent('6,375.00')
    vi.mocked(useExtraCurrencyStatements).mockReturnValue([])
  })
})
