import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
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
    previewValuation: { ...noOpMutation },
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
        nativeCurrency: 'EUR',
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
        nativeCurrency: 'USD',
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

// ─── Multi-currency tests (MC-01, MC-06, MC-15, MC-26) ────────────────────────

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
      previewValuation: { ...noOpMutation },
      editTransaction: { ...noOpMutation, mutate: editMutate },
      deleteTransaction: { ...noOpMutation },
      createInitialBalance: { ...noOpMutation },
      editInitialBalance: { ...noOpMutation },
      deleteInitialBalance: { ...noOpMutation },
    })
  })

  const fxItems = [
    { accountId: 'acc-1', accountCode: '1000', accountName: 'Cash', debitAmount: 100 },
    { accountId: 'acc-2', accountCode: '2000', accountName: 'Payables', creditAmount: 110 },
  ]

  it('shows the native currency of each line, not a currency choice', () => {
    renderWithProviders(<TransactionForm {...editProps(fxItems)} />)

    const rows = screen.getAllByTestId('form-item-row')
    expect(within(rows[0]).getByTestId('native-currency')).toHaveTextContent('EUR')
    expect(within(rows[1]).getByTestId('native-currency')).toHaveTextContent('USD')
    expect(within(rows[0]).queryByTestId('currency-select')).not.toBeInTheDocument()
  })

  it('totals each native currency on its own and leaves the balance to the valuation', () => {
    renderWithProviders(<TransactionForm {...editProps(fxItems)} />)

    const totals = screen.getAllByTestId('currency-totals')
    expect(totals).toHaveLength(2)
    expect(screen.getByTestId('valuation-section')).toBeInTheDocument()
    // 100 EUR and 110 USD are never added together: the chip waits for the valuation check
    expect(screen.getByTestId('balance-chip')).toHaveTextContent(/not checked/i)
  })

  it('has no valuation section when every account is in the base currency', () => {
    renderWithProviders(
      <TransactionForm
        {...editProps([
          { accountId: 'acc-2', accountCode: '2000', accountName: 'Payables', debitAmount: 5 },
          { accountId: 'acc-2', accountCode: '2000', accountName: 'Payables', creditAmount: 5 },
        ])}
      />,
    )

    expect(screen.queryByTestId('valuation-section')).not.toBeInTheDocument()
    expect(screen.getByTestId('balance-chip')).toHaveTextContent(/^balanced$/i)
  })

  it('keeps the stored rates on edit: sends no valuation and no equivalents (MC-26)', async () => {
    renderWithProviders(
      <TransactionForm
        {...editProps(fxItems)}
        initialData={{
          ...editProps(fxItems).initialData,
          valuation: { mode: 'RATES', rates: [{ currency: 'EUR', rate: 1.1 }] },
        }}
      />,
    )

    expect(screen.getByText(/EUR 1.1/)).toBeInTheDocument()
    expect(screen.queryByTestId('rate-input')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    const body = editMutate.mock.calls[0][0].body
    expect(body.valuation).toBeUndefined()
    expect(body.items[0]).not.toHaveProperty('equivalents')
  })

  it('sends the exact amounts typed for each equivalent in mode EXACT_AMOUNTS', async () => {
    renderWithProviders(
      <TransactionForm
        {...editProps([
          { ...fxItems[0], equivalents: [{ currency: 'USD', amount: 110 }] },
          fxItems[1],
        ])}
        initialData={{
          ...editProps(fxItems).initialData,
          valuation: { mode: 'EXACT_AMOUNTS', rates: [] },
          items: [
            { ...fxItems[0], equivalents: [{ currency: 'USD', amount: 110 }] },
            fxItems[1],
          ] as never,
        }}
      />,
    )

    const input = screen.getByTestId('equivalent-input').querySelector('input') as HTMLInputElement
    expect(input.value).toBe('110')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    const body = editMutate.mock.calls[0][0].body
    expect(body.valuation).toEqual({ mode: 'EXACT_AMOUNTS' })
    expect(body.items[0].equivalents).toEqual([{ currency: 'USD', amount: 110 }])
  })

  it('does not allow saving exact amounts while an equivalent is empty', async () => {
    renderWithProviders(
      <TransactionForm
        {...editProps(fxItems)}
        initialData={{
          ...editProps(fxItems).initialData,
          valuation: { mode: 'EXACT_AMOUNTS', rates: [] },
        }}
      />,
    )

    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })

  it('asks for the rate table when a transaction without stored valuation is edited', async () => {
    renderWithProviders(<TransactionForm {...editProps(fxItems)} />)

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(editMutate.mock.calls[0][0].body.valuation).toEqual({ mode: 'RATE_TABLE' })
  })
})
