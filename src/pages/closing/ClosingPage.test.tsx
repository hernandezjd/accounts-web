import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { ClosingPage } from './ClosingPage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ workspaceId: 'test-workspace' }),
  }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('./ClosingDialog', () => ({
  ClosingDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="closing-dialog">Dialog Content</div> : null,
}))

import { useWorkspaceConfig } from '@/hooks/api/useWorkspaceConfig'

vi.mock('@/hooks/api/useWorkspaceConfig', () => ({
  useWorkspaceConfig: vi.fn(() => ({
    data: undefined,
    isLoading: true,
    error: null,
  })),
}))

vi.mock('@/components/error/ErrorMessage', () => ({
  ErrorMessage: ({ error }: { error: unknown }) =>
    error ? <div data-testid="error-message">{JSON.stringify(error)}</div> : null,
}))

const mockUseWorkspaceConfig = vi.mocked(useWorkspaceConfig)

function mockConfig(overrides: Record<string, unknown> = {}) {
  const fullConfig = {
    nominalAccounts: ['acc-1', 'acc-2'],
    profitLossAccountId: 'pl-acc',
    closingTransactionTypeId: 'txn-type',
    ...overrides,
  }
  mockUseWorkspaceConfig.mockReturnValue({
    data: fullConfig,
    isLoading: false,
    error: null,
  } as ReturnType<typeof useWorkspaceConfig>)
}

const renderComponent = () => {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <BrowserRouter>
      <QueryClientProvider client={testQueryClient}>
        <ClosingPage />
      </QueryClientProvider>
    </BrowserRouter>,
  )
}

describe('ClosingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset default mock: config not loaded yet
    mockUseWorkspaceConfig.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useWorkspaceConfig>)
  })

  it('renders the closing page title', () => {
    renderComponent()
    expect(screen.getByText('closing.accountClosing')).toBeInTheDocument()
  })

  it('displays description and process text when config is loaded', () => {
    mockConfig()
    renderComponent()
    expect(screen.getByText('closing.closingDescription')).toBeInTheDocument()
    expect(screen.getByText('closing.closingProcess')).toBeInTheDocument()
  })

  it('shows Preview button text', () => {
    mockConfig()
    renderComponent()
    const button = screen.getByTestId('open-closing-dialog-button')
    expect(button).toHaveTextContent('closing.preview')
  })

  describe('Prerequisite Validation', () => {
    it('enables Preview button when all prerequisites are met', () => {
      mockConfig()
      renderComponent()
      expect(screen.getByTestId('open-closing-dialog-button')).not.toBeDisabled()
    })

    it('shows loading spinner when config is not loaded yet', () => {
      renderComponent()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.queryByTestId('open-closing-dialog-button')).not.toBeInTheDocument()
    })

    it('shows warning when nominal accounts are not configured', () => {
      mockConfig({ nominalAccounts: null })
      renderComponent()
      expect(screen.getByTestId('warning-nominal-accounts')).toBeInTheDocument()
      expect(screen.getByTestId('open-closing-dialog-button')).toBeDisabled()
    })

    it('shows warning when nominal accounts are empty', () => {
      mockConfig({ nominalAccounts: [] })
      renderComponent()
      expect(screen.getByTestId('warning-nominal-accounts')).toBeInTheDocument()
    })

    it('shows warning when P&L account is not configured', () => {
      mockConfig({ profitLossAccountId: null })
      renderComponent()
      expect(screen.getByTestId('warning-profit-loss-account')).toBeInTheDocument()
      expect(screen.getByTestId('open-closing-dialog-button')).toBeDisabled()
    })

    it('shows warning when closing transaction type is not configured', () => {
      mockConfig({ closingTransactionTypeId: null })
      renderComponent()
      expect(screen.getByTestId('warning-closing-transaction-type')).toBeInTheDocument()
      expect(screen.getByTestId('open-closing-dialog-button')).toBeDisabled()
    })

    it('shows all warnings when nothing is configured', () => {
      mockConfig({ nominalAccounts: null, profitLossAccountId: null, closingTransactionTypeId: null })
      renderComponent()
      expect(screen.getByTestId('warning-nominal-accounts')).toBeInTheDocument()
      expect(screen.getByTestId('warning-profit-loss-account')).toBeInTheDocument()
      expect(screen.getByTestId('warning-closing-transaction-type')).toBeInTheDocument()
    })

    it('does not show warnings when all prerequisites are met', () => {
      mockConfig()
      renderComponent()
      expect(screen.queryByTestId('warning-nominal-accounts')).not.toBeInTheDocument()
      expect(screen.queryByTestId('warning-profit-loss-account')).not.toBeInTheDocument()
      expect(screen.queryByTestId('warning-closing-transaction-type')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('navigates to Accounting Config tab for nominal accounts', () => {
      mockConfig({ nominalAccounts: null })
      renderComponent()
      fireEvent.click(screen.getByTestId('warning-nominal-accounts-button'))
      expect(mockNavigate).toHaveBeenCalledWith('/workspaces/test-workspace/setup', {
        state: { initialTab: 1, initialEditMode: 'nominalAccounts' },
      })
    })

    it('navigates to Accounting Config tab for P&L account', () => {
      mockConfig({ profitLossAccountId: null })
      renderComponent()
      fireEvent.click(screen.getByTestId('warning-profit-loss-account-button'))
      expect(mockNavigate).toHaveBeenCalledWith('/workspaces/test-workspace/setup', {
        state: { initialTab: 1, initialEditMode: 'nominalAccounts' },
      })
    })

    it('navigates to Accounting Config tab for closing transaction type', () => {
      mockConfig({ closingTransactionTypeId: null })
      renderComponent()
      fireEvent.click(screen.getByTestId('warning-closing-transaction-type-button'))
      expect(mockNavigate).toHaveBeenCalledWith('/workspaces/test-workspace/setup', {
        state: { initialTab: 1, initialEditMode: 'closingTransactionType' },
      })
    })
  })

  describe('Dialog Interaction', () => {
    it('opens the dialog when Preview button is clicked', () => {
      mockConfig()
      renderComponent()
      fireEvent.click(screen.getByTestId('open-closing-dialog-button'))
      expect(screen.getByTestId('closing-dialog')).toBeInTheDocument()
    })

    it('does not open dialog when button is disabled', () => {
      mockConfig({ nominalAccounts: null })
      renderComponent()
      fireEvent.click(screen.getByTestId('open-closing-dialog-button'))
      expect(screen.queryByTestId('closing-dialog')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('shows error message when config fetch fails', () => {
      const mockError = {
        userMessage: 'You do not have access to this workspace',
        errorCode: 'FORBIDDEN',
        isRetryable: false,
      }
      mockUseWorkspaceConfig.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
      } as ReturnType<typeof useWorkspaceConfig>)
      renderComponent()
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
      expect(screen.queryByTestId('open-closing-dialog-button')).not.toBeInTheDocument()
    })

    it('hides button and shows loading state initially', () => {
      renderComponent()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.queryByTestId('open-closing-dialog-button')).not.toBeInTheDocument()
    })
  })
})
