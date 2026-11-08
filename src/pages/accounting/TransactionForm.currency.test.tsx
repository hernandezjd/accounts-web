import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { TransactionForm } from './TransactionForm'

// ─── Mock all hooks ────────────────────────────────────────────────────────────

vi.mock('@/hooks/api/useTransactionTypes', () => ({
  useTransactionTypes: vi.fn(),
}))
vi.mock('@/hooks/api/useWorkspaceConfig', () => ({
  useWorkspaceConfig: vi.fn(),
}))
vi.mock('@/hooks/api/useTransactionMutations', () => ({
  useTransactionMutations: vi.fn(),
}))
vi.mock('@/hooks/api/useAccounts', () => ({
  useAccounts: vi.fn(),
}))
vi.mock('@/hooks/api/useThirdParties', () => ({
  useThirdParties: vi.fn(),
}))
vi.mock('@/hooks/api/useAccountMutations', () => ({
  useAccountMutations: vi.fn(),
}))
vi.mock('@/hooks/api/useThirdPartyMutations', () => ({
  useThirdPartyMutations: vi.fn(),
}))

import { useTransactionTypes } from '@/hooks/api/useTransactionTypes'
import { useWorkspaceConfig } from '@/hooks/api/useWorkspaceConfig'
import { useTransactionMutations } from '@/hooks/api/useTransactionMutations'
import { useAccounts } from '@/hooks/api/useAccounts'
import { useThirdParties } from '@/hooks/api/useThirdParties'
import { useAccountMutations } from '@/hooks/api/useAccountMutations'
import { useThirdPartyMutations } from '@/hooks/api/useThirdPartyMutations'

const mockUseTransactionTypes = vi.mocked(useTransactionTypes)
const mockUseWorkspaceConfig = vi.mocked(useWorkspaceConfig)
const mockUseTransactionMutations = vi.mocked(useTransactionMutations)
const mockUseAccounts = vi.mocked(useAccounts)
const mockUseThirdParties = vi.mocked(useThirdParties)
const mockUseAccountMutations = vi.mocked(useAccountMutations)
const mockUseThirdPartyMutations = vi.mocked(useThirdPartyMutations)

// ─── Default mock return values ────────────────────────────────────────────────

const noOpMutation = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
}

function setupDefaultMocks() {
  mockUseTransactionTypes.mockReturnValue({
    data: [{ id: 'type-1', name: 'Invoice' }],
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useTransactionTypes>)

  mockUseWorkspaceConfig.mockReturnValue({
    data: {
      systemInitialDate: '2025-01-01',
      lockedPeriodDate: null,
      baseCurrency: 'USD',
      enabledCurrencies: ['EUR', 'USD'],
    },
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useWorkspaceConfig>)

  mockUseTransactionMutations.mockReturnValue({
    createTransaction: { ...noOpMutation },
    editTransaction: { ...noOpMutation },
    deleteTransaction: { ...noOpMutation },
    createInitialBalance: { ...noOpMutation },
    editInitialBalance: { ...noOpMutation },
    deleteInitialBalance: { ...noOpMutation },
  })

  mockUseAccounts.mockReturnValue({
    data: [
      {
        id: 'acc-1',
        code: '1000',
        name: 'Cash',
        hasChildren: false,
        hasThirdParties: false,
        level: 2,
        parentId: null,
        currencies: ['EUR', 'USD'],
        balances: [],
      },
      {
        id: 'acc-2',
        code: '2000',
        name: 'Payables',
        hasChildren: false,
        hasThirdParties: false,
        level: 2,
        parentId: null,
        currencies: ['USD'],
        balances: [],
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useAccounts>)

  mockUseThirdParties.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
  } as ReturnType<typeof useThirdParties>)

  mockUseAccountMutations.mockReturnValue({
    createAccount: { ...noOpMutation },
  })

  mockUseThirdPartyMutations.mockReturnValue({
    createThirdParty: { ...noOpMutation },
  })
}

const defaultProps = {
  workspaceId: 'workspace-1',
  mode: 'create' as const,
  onSuccess: vi.fn(),
  onCancel: vi.fn(),
}

// ─── Multi-currency tests (REQ-CUR-05 to REQ-CUR-07) ──────────────────────────

const editMutate = vi.fn()

function editProps(items: Array<Record<string, unknown>>) {
  return {
    ...defaultProps,
    mode: 'edit' as const,
    transactionId: 'txn-1',
    initialData: {
      transactionTypeId: 'type-1',
      transactionTypeName: 'Invoice',
      transactionNumber: 'N-1',
      date: '2025-03-01',
      description: 'FX purchase',
      items: items as never,
    },
  }
}

describe('TransactionForm multi-currency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
    mockUseTransactionMutations.mockReturnValue({
      createTransaction: { ...noOpMutation },
      editTransaction: { ...noOpMutation, mutate: editMutate },
      deleteTransaction: { ...noOpMutation },
      createInitialBalance: { ...noOpMutation },
      editInitialBalance: { ...noOpMutation },
      deleteInitialBalance: { ...noOpMutation },
    })
  })

  const fxItems = [
    { accountId: 'acc-1', accountCode: '1000', accountName: 'Cash', debitAmount: 100, currency: 'EUR', rate: 1.1, baseAmount: 110 },
    { accountId: 'acc-2', accountCode: '2000', accountName: 'Payables', creditAmount: 110, currency: 'USD', rate: 1, baseAmount: 110 },
  ]

  it('shows rate and base amount only for an item that is not in the base currency', () => {
    renderWithProviders(<TransactionForm {...editProps(fxItems)} />)

    const rows = screen.getAllByTestId('form-item-row')
    expect(within(rows[0]).getByTestId('rate-input')).toBeInTheDocument()
    expect(within(rows[0]).getByTestId('base-amount-input')).toBeInTheDocument()
    expect(within(rows[1]).queryByTestId('rate-input')).not.toBeInTheDocument()
  })

  it('balances on the base amounts, not on the amounts of different currencies', () => {
    renderWithProviders(<TransactionForm {...editProps(fxItems)} />)

    // 100 EUR debit and 110 USD credit are not equal, but both are 110.00 in base currency
    expect(screen.getByTestId('balance-chip')).toHaveTextContent(/^balanced$/i)
  })

  it('is unbalanced when the base amounts differ', async () => {
    renderWithProviders(
      <TransactionForm {...editProps([{ ...fxItems[0], rate: 1.2, baseAmount: undefined }, fxItems[1]])} />,
    )

    // rate 1.2 gives 120.00 against a credit of 110.00
    expect(screen.getByTestId('balance-chip')).toHaveTextContent(/unbalanced/i)
  })

  it('sends currency, rate and base amount of foreign items and none for base items', async () => {
    renderWithProviders(<TransactionForm {...editProps(fxItems)} />)

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(editMutate).toHaveBeenCalledOnce()
    const body = editMutate.mock.calls[0][0].body
    expect(body.items[0]).toMatchObject({ accountId: 'acc-1', debitAmount: 100, currency: 'EUR', rate: 1.1, baseAmount: 110 })
    expect(body.items[1]).not.toHaveProperty('currency')
    expect(body.items[1]).not.toHaveProperty('rate')
  })

  it('does not allow saving a foreign item without a rate', async () => {
    renderWithProviders(
      <TransactionForm {...editProps([{ ...fxItems[0], rate: undefined, baseAmount: undefined }, fxItems[1]])} />,
    )

    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })

  it('totals are shown with the decimals of the base currency', () => {
    renderWithProviders(<TransactionForm {...editProps(fxItems)} />)

    expect(screen.getAllByText('110.00').length).toBeGreaterThanOrEqual(2)
  })
})
