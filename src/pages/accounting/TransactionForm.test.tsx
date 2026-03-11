import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { TransactionForm } from './TransactionForm'

// ─── Mock all hooks ────────────────────────────────────────────────────────────

vi.mock('@/hooks/api/useTransactionTypes', () => ({
  useTransactionTypes: vi.fn(),
}))
vi.mock('@/hooks/api/useTenantConfig', () => ({
  useTenantConfig: vi.fn(),
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
import { useTenantConfig } from '@/hooks/api/useTenantConfig'
import { useTransactionMutations } from '@/hooks/api/useTransactionMutations'
import { useAccounts } from '@/hooks/api/useAccounts'
import { useThirdParties } from '@/hooks/api/useThirdParties'
import { useAccountMutations } from '@/hooks/api/useAccountMutations'
import { useThirdPartyMutations } from '@/hooks/api/useThirdPartyMutations'

const mockUseTransactionTypes = vi.mocked(useTransactionTypes)
const mockUseTenantConfig = vi.mocked(useTenantConfig)
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

  mockUseTenantConfig.mockReturnValue({
    data: { systemInitialDate: '2025-01-01', closedPeriodDate: null },
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useTenantConfig>)

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
        balance: 0,
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
  tenantId: 'tenant-1',
  mode: 'create' as const,
  onSuccess: vi.fn(),
  onCancel: vi.fn(),
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TransactionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('renders create mode with type field, date field, and description', () => {
    renderWithProviders(<TransactionForm {...defaultProps} />)

    expect(screen.getByTestId('transaction-form')).toBeInTheDocument()
    expect(screen.getByLabelText(/transaction type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/transaction number/i)).toBeInTheDocument()
  })

  it('shows one item row by default', () => {
    renderWithProviders(<TransactionForm {...defaultProps} />)

    const rows = screen.getAllByTestId('form-item-row')
    expect(rows).toHaveLength(1)
  })

  it('adds an item row when "Add Item" is clicked', async () => {
    renderWithProviders(<TransactionForm {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /add item/i }))

    const rows = screen.getAllByTestId('form-item-row')
    expect(rows).toHaveLength(2)
  })

  it('removes an item row when remove button is clicked (only when more than one)', async () => {
    renderWithProviders(<TransactionForm {...defaultProps} />)

    // Add a second item first
    await userEvent.click(screen.getByRole('button', { name: /add item/i }))
    expect(screen.getAllByTestId('form-item-row')).toHaveLength(2)

    // Remove one
    const removeButtons = screen.getAllByRole('button', { name: /remove item/i })
    await userEvent.click(removeButtons[0])
    expect(screen.getAllByTestId('form-item-row')).toHaveLength(1)
  })

  it('does not show balance chip when no amounts are entered', () => {
    renderWithProviders(<TransactionForm {...defaultProps} />)

    expect(screen.queryByTestId('balance-chip')).not.toBeInTheDocument()
  })

  it('shows "Unbalanced" chip when debits and credits do not match', async () => {
    renderWithProviders(<TransactionForm {...defaultProps} />)

    const row = screen.getAllByTestId('form-item-row')[0]
    const debitInput = within(row).getAllByRole('textbox')[1]
    await userEvent.type(debitInput, '100')

    const chip = screen.getByTestId('balance-chip')
    expect(chip).toHaveTextContent(/unbalanced/i)
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn()
    renderWithProviders(<TransactionForm {...defaultProps} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('shows delete button in edit mode', () => {
    renderWithProviders(
      <TransactionForm
        {...defaultProps}
        mode="edit"
        transactionId="txn-1"
        initialData={{
          transactionTypeId: 'type-1',
          transactionTypeName: 'Invoice',
          transactionNumber: 'INV-001',
          date: '2026-01-15',
          description: 'Test',
          items: [
            {
              accountId: 'acc-1',
              accountCode: '1000',
              accountName: 'Cash',
              debitAmount: 100,
              creditAmount: 0,
            },
          ],
        }}
      />,
    )

    expect(screen.getByRole('button', { name: /delete transaction/i })).toBeInTheDocument()
  })

  it('does not show delete button in create mode', () => {
    renderWithProviders(<TransactionForm {...defaultProps} />)

    expect(screen.queryByRole('button', { name: /delete transaction/i })).not.toBeInTheDocument()
  })

  it('shows confirmation dialog when delete button is clicked', async () => {
    renderWithProviders(
      <TransactionForm
        {...defaultProps}
        mode="edit"
        transactionId="txn-1"
        initialData={{
          transactionTypeId: 'type-1',
          transactionTypeName: 'Invoice',
          transactionNumber: 'INV-001',
          date: '2026-01-15',
          description: 'Test',
          items: [
            {
              accountId: 'acc-1',
              accountCode: '1000',
              accountName: 'Cash',
              debitAmount: 100,
              creditAmount: 0,
            },
          ],
        }}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /delete transaction/i }))

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    })
  })

  it('calls deleteTransaction mutation when confirm delete is clicked', async () => {
    const deleteMutate = vi.fn()
    mockUseTransactionMutations.mockReturnValue({
      createTransaction: { ...noOpMutation },
      editTransaction: { ...noOpMutation },
      deleteTransaction: { ...noOpMutation, mutate: deleteMutate },
      createInitialBalance: { ...noOpMutation },
      editInitialBalance: { ...noOpMutation },
      deleteInitialBalance: { ...noOpMutation },
    })

    renderWithProviders(
      <TransactionForm
        {...defaultProps}
        mode="edit"
        transactionId="txn-1"
        initialData={{
          transactionTypeId: 'type-1',
          transactionTypeName: 'Invoice',
          transactionNumber: 'INV-001',
          date: '2026-01-15',
          description: 'Test',
          items: [
            {
              accountId: 'acc-1',
              accountCode: '1000',
              accountName: 'Cash',
              debitAmount: 100,
              creditAmount: 0,
            },
          ],
        }}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /delete transaction/i }))
    await waitFor(() => screen.getByText(/are you sure/i))

    const confirmBtn = screen.getByRole('button', { name: /^delete$/i })
    await userEvent.click(confirmBtn)

    expect(deleteMutate).toHaveBeenCalledWith('txn-1', expect.any(Object))
  })

  it('renders initial balance mode without type field and with read-only date', () => {
    renderWithProviders(
      <TransactionForm {...defaultProps} mode="createInitialBalance" />,
    )

    expect(screen.queryByLabelText(/transaction type/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('initial-balance-date')).toBeInTheDocument()
  })

  it('initial balance mode shows date from tenant config', () => {
    renderWithProviders(
      <TransactionForm {...defaultProps} mode="createInitialBalance" />,
    )

    const dateField = screen.getByTestId('initial-balance-date')
    const input = dateField.querySelector('input')
    expect(input).toHaveValue('2025-01-01')
  })

  // REQ-INIT-09: warning when initial date not configured (warning shown at page level, not in form — see FR-073)
  it('disables save button in create mode when systemInitialDate is null', () => {
    mockUseTenantConfig.mockReturnValue({
      data: { systemInitialDate: null, closedPeriodDate: null },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTenantConfig>)

    renderWithProviders(<TransactionForm {...defaultProps} mode="create" />)

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('does not show warning in create mode when systemInitialDate is set', () => {
    renderWithProviders(<TransactionForm {...defaultProps} mode="create" />)

    expect(screen.queryByTestId('initial-date-warning')).not.toBeInTheDocument()
  })

  // FR-077: description mandatory for regular transactions
  it('disables save button when description is empty in create mode', async () => {
    renderWithProviders(<TransactionForm {...defaultProps} mode="create" />)

    // Fill required fields except description
    const numberInput = screen.getByLabelText(/transaction number/i)
    await userEvent.type(numberInput, 'TXN-001')

    const dateInput = screen.getByTestId('date-field').querySelector('input')!
    fireEvent.change(dateInput, { target: { value: '2025-06-01' } })

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('disables save button when description is empty in edit mode', () => {
    renderWithProviders(
      <TransactionForm
        {...defaultProps}
        mode="edit"
        transactionId="txn-1"
        initialData={{
          transactionTypeId: 'type-1',
          transactionTypeName: 'Invoice',
          transactionNumber: 'INV-001',
          date: '2026-01-15',
          description: '',
          items: [
            {
              accountId: 'acc-1',
              accountCode: '1000',
              accountName: 'Cash',
              debitAmount: 100,
              creditAmount: 0,
            },
          ],
        }}
      />,
    )

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('shows description field as required in create mode', () => {
    renderWithProviders(<TransactionForm {...defaultProps} mode="create" />)

    const descriptionInput = screen.getByLabelText(/description \*/i)
    expect(descriptionInput).toBeInTheDocument()
  })

  it('shows description field as required in edit mode', () => {
    renderWithProviders(
      <TransactionForm
        {...defaultProps}
        mode="edit"
        transactionId="txn-1"
        initialData={{
          transactionTypeId: 'type-1',
          transactionTypeName: 'Invoice',
          transactionNumber: 'INV-001',
          date: '2026-01-15',
          description: 'Test',
          items: [
            {
              accountId: 'acc-1',
              accountCode: '1000',
              accountName: 'Cash',
              debitAmount: 100,
              creditAmount: 0,
            },
          ],
        }}
      />,
    )

    const descriptionInput = screen.getByLabelText(/description \*/i)
    expect(descriptionInput).toBeInTheDocument()
  })

  it('description field is required in createInitialBalance mode', () => {
    renderWithProviders(<TransactionForm {...defaultProps} mode="createInitialBalance" />)

    const descriptionField = screen.getByLabelText(/description/i) as HTMLInputElement
    expect(descriptionField).toBeInTheDocument()
    expect(descriptionField).toHaveAttribute('required')
  })

  // FR-070: date before initial date validation
  it('renders date field with min attribute equal to systemInitialDate', () => {
    renderWithProviders(<TransactionForm {...defaultProps} mode="create" />)

    const dateInput = screen.getByTestId('date-field').querySelector('input')
    expect(dateInput).toHaveAttribute('min', '2025-01-01')
  })

  it('shows error and disables save when entered date is before systemInitialDate', async () => {
    renderWithProviders(<TransactionForm {...defaultProps} mode="create" />)

    const dateInput = screen.getByTestId('date-field').querySelector('input')!
    fireEvent.change(dateInput, { target: { value: '2024-12-31' } })

    expect(screen.getByTestId('date-before-initial-date-error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('clears error and enables save when date is corrected to equal systemInitialDate', async () => {
    renderWithProviders(<TransactionForm {...defaultProps} mode="create" />)

    const dateInput = screen.getByTestId('date-field').querySelector('input')!
    fireEvent.change(dateInput, { target: { value: '2024-12-31' } })
    expect(screen.getByTestId('date-before-initial-date-error')).toBeInTheDocument()

    fireEvent.change(dateInput, { target: { value: '2025-01-01' } })
    expect(screen.queryByTestId('date-before-initial-date-error')).not.toBeInTheDocument()
  })

  // FR-086: pre-fill date with today's date
  it('prefills date with today when creating transaction and today >= systemInitialDate', () => {
    // Mock today as 2025-06-15, systemInitialDate as 2025-01-01 (before today)
    mockUseTenantConfig.mockReturnValue({
      data: { systemInitialDate: '2025-01-01', closedPeriodDate: null },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTenantConfig>)

    // Temporarily set today's date for the test by mocking Date
    const mockDate = new Date(2025, 5, 15) // June 15, 2025
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    renderWithProviders(<TransactionForm {...defaultProps} mode="create" />)

    const dateInput = screen.getByTestId('date-field').querySelector('input') as HTMLInputElement
    expect(dateInput.value).toBe('2025-06-15')

    vi.useRealTimers()
  })

  it('leaves date empty when creating transaction and today < systemInitialDate', () => {
    // Mock today as 2024-12-15, systemInitialDate as 2025-01-01 (after today)
    mockUseTenantConfig.mockReturnValue({
      data: { systemInitialDate: '2025-01-01', closedPeriodDate: null },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTenantConfig>)

    // Temporarily set today's date for the test
    const mockDate = new Date(2024, 11, 15) // December 15, 2024
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    renderWithProviders(<TransactionForm {...defaultProps} mode="create" />)

    const dateInput = screen.getByTestId('date-field').querySelector('input') as HTMLInputElement
    expect(dateInput.value).toBe('')

    vi.useRealTimers()
  })

  it('does not prefill date in edit mode', () => {
    // Even though today is 2025-06-15 and systemInitialDate is 2025-01-01,
    // edit mode should use the provided initialData date, not today
    const mockDate = new Date(2025, 5, 15) // June 15, 2025
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    renderWithProviders(
      <TransactionForm
        {...defaultProps}
        mode="edit"
        transactionId="txn-1"
        initialData={{
          transactionTypeId: 'type-1',
          transactionTypeName: 'Invoice',
          transactionNumber: 'INV-001',
          date: '2025-03-10',
          description: 'Test',
          items: [
            {
              accountId: 'acc-1',
              accountCode: '1000',
              accountName: 'Cash',
              debitAmount: 100,
              creditAmount: 0,
            },
          ],
        }}
      />,
    )

    const dateInput = screen.getByTestId('date-field').querySelector('input') as HTMLInputElement
    expect(dateInput.value).toBe('2025-03-10') // Should use initialData date, not today

    vi.useRealTimers()
  })

  // FR-085: debit/credit field input validation
  it('renders debit and credit fields with correct testid', () => {
    renderWithProviders(<TransactionForm {...defaultProps} />)

    const row = screen.getByTestId('form-item-row')
    expect(within(row).getByTestId('debit-input')).toBeInTheDocument()
    expect(within(row).getByTestId('credit-input')).toBeInTheDocument()
  })

  it('accepts valid digit input in debit field', async () => {
    renderWithProviders(<TransactionForm {...defaultProps} />)

    const row = screen.getByTestId('form-item-row')
    const debitInput = within(row).getByTestId('debit-input').querySelector('input')!
    await userEvent.type(debitInput, '100')

    expect(debitInput).toHaveValue('100')
  })

  it('accepts valid digit input in credit field', async () => {
    renderWithProviders(<TransactionForm {...defaultProps} />)

    const row = screen.getByTestId('form-item-row')
    const creditInput = within(row).getByTestId('credit-input').querySelector('input')!
    await userEvent.type(creditInput, '100')

    expect(creditInput).toHaveValue('100')
  })

  it('normalises comma to dot in debit field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TransactionForm {...defaultProps} />)

    const row = screen.getByTestId('form-item-row')
    const debitInput = within(row).getByTestId('debit-input').querySelector('input')!
    await user.type(debitInput, '12,50')

    expect(debitInput).toHaveValue('12.50')
  })

  it('normalises comma to dot in credit field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TransactionForm {...defaultProps} />)

    const row = screen.getByTestId('form-item-row')
    const creditInput = within(row).getByTestId('credit-input').querySelector('input')!
    await user.type(creditInput, '12,50')

    expect(creditInput).toHaveValue('12.50')
  })

  it('blocks invalid keys in debit field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TransactionForm {...defaultProps} />)

    const row = screen.getByTestId('form-item-row')
    const debitInput = within(row).getByTestId('debit-input').querySelector('input')!
    await user.type(debitInput, '100a')

    // 'a' should be blocked, only '100' remains
    expect(debitInput).toHaveValue('100')
  })

  it('blocks invalid keys in credit field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TransactionForm {...defaultProps} />)

    const row = screen.getByTestId('form-item-row')
    const creditInput = within(row).getByTestId('credit-input').querySelector('input')!
    await user.type(creditInput, '100-')

    // '-' should be blocked, only '100' remains
    expect(creditInput).toHaveValue('100')
  })


  it('preserves mutual-exclusion: entering debit clears credit', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TransactionForm {...defaultProps} />)

    const row = screen.getByTestId('form-item-row')
    const debitInput = within(row).getByTestId('debit-input').querySelector('input')!
    const creditInput = within(row).getByTestId('credit-input').querySelector('input')!

    // Enter credit first
    await user.type(creditInput, '100')
    expect(creditInput).toHaveValue('100')

    // Enter debit — should clear credit
    await user.type(debitInput, '50')
    expect(debitInput).toHaveValue('50')
    expect(creditInput).toHaveValue('')
  })

  it('preserves mutual-exclusion: entering credit clears debit', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TransactionForm {...defaultProps} />)

    const row = screen.getByTestId('form-item-row')
    const debitInput = within(row).getByTestId('debit-input').querySelector('input')!
    const creditInput = within(row).getByTestId('credit-input').querySelector('input')!

    // Enter debit first
    await user.type(debitInput, '100')
    expect(debitInput).toHaveValue('100')

    // Enter credit — should clear debit
    await user.type(creditInput, '50')
    expect(creditInput).toHaveValue('50')
    expect(debitInput).toHaveValue('')
  })
})
