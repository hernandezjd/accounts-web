import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockMutation, mockQuery } from '@/test-utils/mockReactQuery'
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
vi.mock('@/hooks/api/useExchangeRates', () => ({
  useExchangeRates: vi.fn(),
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
import { useExchangeRates } from '@/hooks/api/useExchangeRates'

const mockUseTransactionTypes = vi.mocked(useTransactionTypes)
const mockUseWorkspaceConfig = vi.mocked(useWorkspaceConfig)
const mockUseTransactionMutations = vi.mocked(useTransactionMutations)
const mockUseAccounts = vi.mocked(useAccounts)
const mockUseThirdParties = vi.mocked(useThirdParties)
const mockUseAccountMutations = vi.mocked(useAccountMutations)
const mockUseThirdPartyMutations = vi.mocked(useThirdPartyMutations)
const mockUseExchangeRates = vi.mocked(useExchangeRates)

function mockTableRates(rates: Array<{ baseCurrency: string; currency: string; rate: number }>) {
  mockUseExchangeRates.mockReturnValue({ data: rates } as ReturnType<typeof useExchangeRates>)
}

// ─── Default mock return values ────────────────────────────────────────────────

function setupDefaultMocks() {
  mockTableRates([])

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
    createTransaction: mockMutation(),
    previewValuation: mockMutation(),
    editTransaction: mockMutation(),
    deleteTransaction: mockMutation(),
    createInitialBalance: mockMutation(),
    editInitialBalance: mockMutation(),
    deleteInitialBalance: mockMutation(),
  })

  mockUseAccounts.mockReturnValue(mockQuery({
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
  }))

  mockUseThirdParties.mockReturnValue(mockQuery({
    data: [],
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
  }))

  mockUseAccountMutations.mockReturnValue({
    updateAccount: mockMutation(),
    deactivateAccount: mockMutation(),
    activateAccount: mockMutation(),
    toggleHasThirdParties: mockMutation(),
    createAccount: mockMutation(),
  })

  mockUseThirdPartyMutations.mockReturnValue({
    updateThirdParty: mockMutation(),
    deactivateThirdParty: mockMutation(),
    activateThirdParty: mockMutation(),
    createThirdParty: mockMutation(),
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
      createTransaction: mockMutation(),
      previewValuation: mockMutation(),
      editTransaction: mockMutation({ mutate: editMutate }),
      deleteTransaction: mockMutation(),
      createInitialBalance: mockMutation(),
      editInitialBalance: mockMutation(),
      deleteInitialBalance: mockMutation(),
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

    expect(screen.getByText(/1 EUR = 1\.1 USD/)).toBeInTheDocument()
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

  async function chooseRatesForThisTransaction() {
    await userEvent.click(within(screen.getByTestId('valuation-mode')).getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: 'Rates for this transaction' }))
  }

  it('asks for a rate below 1 the other way round and sends it in the stored direction', async () => {
    // The table says 0.0004 USD per 1 EUR, so the rate is typed as EUR per 1 USD: 2,500 -> 1 / 2,500 = 0.0004
    mockTableRates([{ baseCurrency: 'USD', currency: 'EUR', rate: 0.0004 }])
    renderWithProviders(<TransactionForm {...editProps(fxItems)} />)
    await chooseRatesForThisTransaction()

    expect(screen.getByText('EUR per 1 USD')).toBeInTheDocument()
    await userEvent.type(within(screen.getByTestId('rate-input')).getByRole('textbox'), '2500')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(editMutate.mock.calls[0][0].body.valuation).toEqual({
      mode: 'RATES',
      rates: [{ currency: 'EUR', rate: 0.0004 }],
    })
  })

  it('asks for a rate of 1 or more as stored, and the direction can be switched', async () => {
    mockTableRates([{ baseCurrency: 'USD', currency: 'EUR', rate: 1.1 }])
    renderWithProviders(<TransactionForm {...editProps(fxItems)} />)
    await chooseRatesForThisTransaction()

    expect(screen.getByText('USD per 1 EUR')).toBeInTheDocument()
    await userEvent.type(within(screen.getByTestId('rate-input')).getByRole('textbox'), '1.25')
    await userEvent.click(screen.getByTestId('rate-direction-toggle'))
    expect(screen.getByText('EUR per 1 USD')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    // 1.25 EUR per 1 USD = 1 / 1.25 = 0.8 USD per 1 EUR
    expect(editMutate.mock.calls[0][0].body.valuation).toEqual({
      mode: 'RATES',
      rates: [{ currency: 'EUR', rate: 0.8 }],
    })
  })

  it('asks for the rate table when a transaction without stored valuation is edited', async () => {
    renderWithProviders(<TransactionForm {...editProps(fxItems)} />)

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(editMutate.mock.calls[0][0].body.valuation).toEqual({ mode: 'RATE_TABLE' })
  })
})
