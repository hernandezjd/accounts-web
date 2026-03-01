import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { SearchBar } from './SearchBar'

// ─── Mock the hook ────────────────────────────────────────────────────────────

vi.mock('@/hooks/api/useUnifiedSearch', () => ({
  useUnifiedSearch: vi.fn(),
}))

import { useUnifiedSearch } from '@/hooks/api/useUnifiedSearch'
const mockUseSearch = vi.mocked(useUnifiedSearch)

// ─── Default props ─────────────────────────────────────────────────────────────

const defaultProps = {
  tenantId: 'tenant-1',
  from: '2026-01-01',
  to: '2026-01-31',
  onAccountSelect: vi.fn(),
  onTransactionSelect: vi.fn(),
}

const emptySearchResult = {
  data: undefined,
  isLoading: false,
  isError: false,
}

const loadedEmptyResult = {
  data: { query: 'x', accounts: [], transactions: [] },
  isLoading: false,
  isError: false,
}

const resultWithAccounts = {
  data: {
    query: 'cash',
    accounts: [
      { accountId: 'acc-1', accountCode: '1000', accountName: 'Cash', level: 1 },
    ],
    transactions: [],
  },
  isLoading: false,
  isError: false,
}

const resultWithTransactions = {
  data: {
    query: 'inv',
    accounts: [],
    transactions: [
      {
        transactionId: 'txn-1',
        transactionNumber: 'INV-001',
        transactionTypeName: 'Invoice',
        date: '2026-01-15',
        description: 'Test invoice',
        items: [{ accountId: 'acc-1', accountCode: '1000', accountName: 'Cash', thirdPartyId: null, thirdPartyName: null, debitAmount: 100, creditAmount: 0 }],
      },
    ],
  },
  isLoading: false,
  isError: false,
}

const loadingResult = {
  data: undefined,
  isLoading: true,
  isError: false,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSearch.mockReturnValue(emptySearchResult as ReturnType<typeof useUnifiedSearch>)
  })

  it('shouldRenderSearchInput', () => {
    renderWithProviders(<SearchBar {...defaultProps} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('shouldShowNoResults_whenQueryReturnsEmpty', async () => {
    mockUseSearch.mockReturnValue(loadedEmptyResult as ReturnType<typeof useUnifiedSearch>)

    renderWithProviders(<SearchBar {...defaultProps} />)

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'xyz')

    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument()
    })
  })

  it('shouldShowAccountResults_whenSearchReturnsAccounts', async () => {
    mockUseSearch.mockReturnValue(resultWithAccounts as ReturnType<typeof useUnifiedSearch>)

    renderWithProviders(<SearchBar {...defaultProps} />)

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'cash')

    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument()
      expect(screen.getByText('1000')).toBeInTheDocument()
    })
  })

  it('shouldShowTransactionResults_whenSearchReturnsTransactions', async () => {
    mockUseSearch.mockReturnValue(resultWithTransactions as ReturnType<typeof useUnifiedSearch>)

    renderWithProviders(<SearchBar {...defaultProps} />)

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'inv')

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument()
      expect(screen.getByText('Invoice')).toBeInTheDocument()
    })
  })

  it('shouldCallOnAccountSelect_whenAccountResultClicked', async () => {
    mockUseSearch.mockReturnValue(resultWithAccounts as ReturnType<typeof useUnifiedSearch>)
    const onAccountSelect = vi.fn()

    renderWithProviders(<SearchBar {...defaultProps} onAccountSelect={onAccountSelect} />)

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'cash')

    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cash'))

    expect(onAccountSelect).toHaveBeenCalledWith('acc-1')
  })

  it('shouldCallOnTransactionSelect_whenTransactionResultClicked', async () => {
    mockUseSearch.mockReturnValue(resultWithTransactions as ReturnType<typeof useUnifiedSearch>)
    const onTransactionSelect = vi.fn()

    renderWithProviders(<SearchBar {...defaultProps} onTransactionSelect={onTransactionSelect} />)

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'inv')

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('INV-001'))

    expect(onTransactionSelect).toHaveBeenCalledWith('txn-1', 'acc-1', '2026-01-15')
  })

  it('shouldScopeToCurrentPeriod_whenAllHistoryOff', async () => {
    mockUseSearch.mockReturnValue(resultWithAccounts as ReturnType<typeof useUnifiedSearch>)

    renderWithProviders(<SearchBar {...defaultProps} />)

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'c')

    await waitFor(() => {
      expect(mockUseSearch).toHaveBeenCalledWith(
        'tenant-1',
        expect.any(String),
        '2026-01-01',
        '2026-01-31',
      )
    })
  })

  it('shouldRemoveDateScope_whenAllHistoryToggled', async () => {
    mockUseSearch.mockReturnValue(resultWithAccounts as ReturnType<typeof useUnifiedSearch>)

    renderWithProviders(<SearchBar {...defaultProps} />)

    // Toggle "Search all history"
    const toggle = screen.getByRole('checkbox')
    fireEvent.click(toggle)

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'c')

    await waitFor(() => {
      expect(mockUseSearch).toHaveBeenCalledWith(
        'tenant-1',
        expect.any(String),
        undefined,
        undefined,
      )
    })
  })

  it('shouldClearInput_whenEscapePressed', async () => {
    mockUseSearch.mockReturnValue(resultWithAccounts as ReturnType<typeof useUnifiedSearch>)

    renderWithProviders(<SearchBar {...defaultProps} />)

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'cash')

    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('shouldShowLoadingState_whenFetching', async () => {
    mockUseSearch.mockReturnValue(loadingResult as ReturnType<typeof useUnifiedSearch>)

    renderWithProviders(<SearchBar {...defaultProps} />)

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'cash')

    await waitFor(() => {
      expect(screen.getByText(/searching/i)).toBeInTheDocument()
    })
  })
})
