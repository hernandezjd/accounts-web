import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { TransactionTypesPage } from './TransactionTypesPage'
import type { TransactionType } from '@/hooks/api/useTransactionTypes'

// ─── Mock hooks ─────────────────────────────────────────────────────────────

vi.mock('@/hooks/api/useTransactionTypes', () => ({
  useTransactionTypes: vi.fn(),
}))
vi.mock('@/hooks/api/useTransactionTypeMutations', () => ({
  useTransactionTypeMutations: vi.fn(),
}))

import { useTransactionTypes } from '@/hooks/api/useTransactionTypes'
import { useTransactionTypeMutations } from '@/hooks/api/useTransactionTypeMutations'

const mockUseTransactionTypes = vi.mocked(useTransactionTypes)
const mockUseTransactionTypeMutations = vi.mocked(useTransactionTypeMutations)

// ─── Sample data ─────────────────────────────────────────────────────────────

const sampleTypes: TransactionType[] = [
  { id: 'tt-1', name: 'Journal Entry' },
  { id: 'tt-2', name: 'Purchase Invoice' },
]

const noOpMutation = { mutate: vi.fn(), isPending: false }

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  mockUseTransactionTypes.mockReturnValue({
    data: sampleTypes,
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useTransactionTypes>)

  mockUseTransactionTypeMutations.mockReturnValue({
    createTransactionType: { ...noOpMutation },
    updateTransactionType: { ...noOpMutation },
    deleteTransactionType: { ...noOpMutation },
  })
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TransactionTypesPage', () => {
  it('renders table headers', () => {
    renderWithProviders(<TransactionTypesPage />)

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  it('renders transaction type rows', () => {
    renderWithProviders(<TransactionTypesPage />)

    expect(screen.getByText('Journal Entry')).toBeInTheDocument()
    expect(screen.getByText('Purchase Invoice')).toBeInTheDocument()
  })

  it('"New Transaction Type" button opens create dialog', async () => {
    renderWithProviders(<TransactionTypesPage />)

    await userEvent.click(screen.getByTestId('new-tt-btn'))

    await waitFor(() => {
      // Check for the name input that only appears inside the dialog
      expect(screen.getByTestId('tt-name-input')).toBeInTheDocument()
    })
  })

  it('Edit button opens dialog with pre-populated name', async () => {
    renderWithProviders(<TransactionTypesPage />)

    await userEvent.click(screen.getByTestId('edit-tt-tt-1'))

    await waitFor(() => {
      expect(screen.getByText('Edit Transaction Type')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Journal Entry')).toBeInTheDocument()
    })
  })

  it('Delete button opens confirmation dialog', async () => {
    renderWithProviders(<TransactionTypesPage />)

    await userEvent.click(screen.getByTestId('delete-tt-tt-1'))

    await waitFor(() => {
      expect(screen.getByText(/are you sure.*delete this transaction type/i)).toBeInTheDocument()
    })
  })

  it('confirming delete calls deleteTransactionType mutation', async () => {
    const deleteMutate = vi.fn()
    mockUseTransactionTypeMutations.mockReturnValue({
      createTransactionType: { ...noOpMutation },
      updateTransactionType: { ...noOpMutation },
      deleteTransactionType: { ...noOpMutation, mutate: deleteMutate },
    })

    renderWithProviders(<TransactionTypesPage />)

    await userEvent.click(screen.getByTestId('delete-tt-tt-1'))
    await waitFor(() => screen.getByTestId('confirm-delete-tt'))
    await userEvent.click(screen.getByTestId('confirm-delete-tt'))

    expect(deleteMutate).toHaveBeenCalledWith('tt-1', expect.any(Object))
  })

  it('shows friendly message on 409 delete error', async () => {
    const deleteMutate = vi.fn((_id, opts) => {
      opts.onError(new Error('409 Conflict: in use'))
    })
    mockUseTransactionTypeMutations.mockReturnValue({
      createTransactionType: { ...noOpMutation },
      updateTransactionType: { ...noOpMutation },
      deleteTransactionType: { ...noOpMutation, mutate: deleteMutate },
    })

    renderWithProviders(<TransactionTypesPage />)

    await userEvent.click(screen.getByTestId('delete-tt-tt-1'))
    await waitFor(() => screen.getByTestId('confirm-delete-tt'))
    await userEvent.click(screen.getByTestId('confirm-delete-tt'))

    await waitFor(() => {
      expect(
        screen.getByText(/in use by existing transactions and cannot be deleted/i),
      ).toBeInTheDocument()
    })
  })

  it('shows loading state while fetching', () => {
    mockUseTransactionTypes.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactionTypes>)

    renderWithProviders(<TransactionTypesPage />)

    expect(screen.getByText(/loading transaction types/i)).toBeInTheDocument()
  })

  it('shows empty state when no transaction types', () => {
    mockUseTransactionTypes.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTransactionTypes>)

    renderWithProviders(<TransactionTypesPage />)

    expect(screen.getByText(/no transaction types found/i)).toBeInTheDocument()
  })
})
