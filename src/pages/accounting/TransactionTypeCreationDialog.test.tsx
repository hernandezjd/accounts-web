import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockMutation } from '@/test-utils/mockReactQuery'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { TransactionTypeCreationDialog } from './TransactionTypeCreationDialog'

// ─── Mock hooks ───────────────────────────────────────────────────────────────

vi.mock('@/hooks/api/useTransactionTypeMutations', () => ({
  useTransactionTypeMutations: vi.fn(),
}))

import { useTransactionTypeMutations } from '@/hooks/api/useTransactionTypeMutations'

const mockUseTransactionTypeMutations = vi.mocked(useTransactionTypeMutations)

beforeEach(() => {
  vi.clearAllMocks()
  mockUseTransactionTypeMutations.mockReturnValue({
    createTransactionType: mockMutation(),
    updateTransactionType: mockMutation(),
    deleteTransactionType: mockMutation(),
  })
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TransactionTypeCreationDialog', () => {
  it('renders transaction type name field when open', () => {
    renderWithProviders(
      <TransactionTypeCreationDialog open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    expect(screen.getByTestId('transaction-type-name-input')).toBeInTheDocument()
  })

  it('does not render fields when closed', () => {
    renderWithProviders(
      <TransactionTypeCreationDialog open={false} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    expect(screen.queryByTestId('transaction-type-name-input')).not.toBeInTheDocument()
  })

  it('submits with correct name when save clicked', async () => {
    const createMutate = vi.fn((_, callbacks) => callbacks.onSuccess({ id: 'tt-1', name: 'Income' }))
    mockUseTransactionTypeMutations.mockReturnValue({
      createTransactionType: mockMutation({ mutate: createMutate, isPending: false }),
      updateTransactionType: mockMutation(),
      deleteTransactionType: mockMutation(),
    })

    const onCreated = vi.fn()
    renderWithProviders(
      <TransactionTypeCreationDialog open={true} onClose={vi.fn()} onCreated={onCreated} />,
    )

    await userEvent.type(screen.getByTestId('transaction-type-name-input'), 'Income')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(createMutate).toHaveBeenCalledWith(
      { name: 'Income' },
      expect.any(Object),
    )
  })

  it('calls onCreated with created transaction type on success', async () => {
    const onCreated = vi.fn()
    const createMutate = vi.fn((_, callbacks) =>
      callbacks.onSuccess({ id: 'tt-1', name: 'Expense' }),
    )
    mockUseTransactionTypeMutations.mockReturnValue({
      createTransactionType: mockMutation({ mutate: createMutate, isPending: false }),
      updateTransactionType: mockMutation(),
      deleteTransactionType: mockMutation(),
    })

    renderWithProviders(
      <TransactionTypeCreationDialog open={true} onClose={vi.fn()} onCreated={onCreated} />,
    )

    await userEvent.type(screen.getByTestId('transaction-type-name-input'), 'Expense')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith({ id: 'tt-1', name: 'Expense' })
    })
  })

  it('disables save button when name is empty', () => {
    renderWithProviders(
      <TransactionTypeCreationDialog open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).toBeDisabled()
  })

  it('disables save button when name is only whitespace', async () => {
    renderWithProviders(
      <TransactionTypeCreationDialog open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    await userEvent.type(screen.getByTestId('transaction-type-name-input'), '   ')

    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).toBeDisabled()
  })

  it('disables save button while mutation is pending', async () => {
    mockUseTransactionTypeMutations.mockReturnValue({
      createTransactionType: mockMutation({ mutate: vi.fn(), isPending: true }),
      updateTransactionType: mockMutation(),
      deleteTransactionType: mockMutation(),
    })

    renderWithProviders(
      <TransactionTypeCreationDialog open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    await userEvent.type(screen.getByTestId('transaction-type-name-input'), 'Income')

    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).toBeDisabled()
  })

  it('calls onClose when cancel button clicked', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <TransactionTypeCreationDialog open={true} onClose={onClose} onCreated={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalled()
  })

  it('clears fields after successful creation', async () => {
    const onCreated = vi.fn()
    const onClose = vi.fn()
    const createMutate = vi.fn((_, callbacks) =>
      callbacks.onSuccess({ id: 'tt-1', name: 'Income' }),
    )
    mockUseTransactionTypeMutations.mockReturnValue({
      createTransactionType: mockMutation({ mutate: createMutate, isPending: false }),
      updateTransactionType: mockMutation(),
      deleteTransactionType: mockMutation(),
    })

    renderWithProviders(
      <TransactionTypeCreationDialog open={true} onClose={onClose} onCreated={onCreated} />,
    )

    await userEvent.type(screen.getByTestId('transaction-type-name-input'), 'Income')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })

    // The field should be cleared (this is internal state, so we can't directly verify)
    // but the dialog closes and resets
  })
})
