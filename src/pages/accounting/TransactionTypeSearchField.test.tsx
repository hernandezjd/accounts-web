import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { TransactionTypeSearchField } from './TransactionTypeSearchField'

// ─── Mock hooks ───────────────────────────────────────────────────────────────

vi.mock('@/hooks/api/useTransactionTypes', () => ({
  useTransactionTypes: vi.fn(),
}))

import { useTransactionTypes } from '@/hooks/api/useTransactionTypes'

const mockUseTransactionTypes = vi.mocked(useTransactionTypes)

const sampleTypes = [
  { id: 'tt-1', name: 'Income' },
  { id: 'tt-2', name: 'Expense' },
  { id: 'tt-3', name: 'Transfer' },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockUseTransactionTypes.mockReturnValue({
    data: sampleTypes,
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useTransactionTypes>)
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TransactionTypeSearchField', () => {
  it('renders autocomplete field with transaction types', () => {
    renderWithProviders(
      <TransactionTypeSearchField value={null} onChange={vi.fn()} />,
    )

    expect(screen.getByRole('combobox', { name: /transaction type/i })).toBeInTheDocument()
  })

  it('displays existing transaction types as options', async () => {
    renderWithProviders(
      <TransactionTypeSearchField value={null} onChange={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('combobox', { name: /transaction type/i }))

    await waitFor(() => {
      expect(screen.getByText('Income')).toBeInTheDocument()
      expect(screen.getByText('Expense')).toBeInTheDocument()
      expect(screen.getByText('Transfer')).toBeInTheDocument()
    })
  })

  it('calls onChange when a transaction type is selected', async () => {
    const onChange = vi.fn()
    renderWithProviders(
      <TransactionTypeSearchField value={null} onChange={onChange} />,
    )

    await userEvent.click(screen.getByRole('combobox', { name: /transaction type/i }))

    await waitFor(() => screen.getByText('Income'))
    await userEvent.click(screen.getByText('Income'))

    expect(onChange).toHaveBeenCalledWith({ id: 'tt-1', name: 'Income' })
  })

  it('displays selected value in the field', async () => {
    const selectedType = { id: 'tt-1', name: 'Income' }
    renderWithProviders(
      <TransactionTypeSearchField value={selectedType} onChange={vi.fn()} />,
    )

    const combobox = screen.getByRole('combobox', { name: /transaction type/i })
    expect(combobox).toHaveValue('Income')
  })

  it('handles null value gracefully', () => {
    renderWithProviders(
      <TransactionTypeSearchField value={null} onChange={vi.fn()} />,
    )

    const combobox = screen.getByRole('combobox', { name: /transaction type/i })
    expect(combobox).toHaveValue('')
  })
})
