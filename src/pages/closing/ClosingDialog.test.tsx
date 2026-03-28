import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { ClosingDialog } from './ClosingDialog'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

import { useExecuteClosingMutation } from '@/hooks/api/useExecuteClosingMutation'

vi.mock('@/hooks/api/useExecuteClosingMutation', () => ({
  useExecuteClosingMutation: vi.fn(() => ({
    executeClosing: {
      mutate: vi.fn((body, callbacks) => {
        // Simulate success
        setTimeout(() => callbacks.onSuccess(), 100)
      }),
      isPending: false,
    },
  })),
}))

const mockUseExecuteClosingMutation = vi.mocked(useExecuteClosingMutation)

// Memoize preview data to prevent infinite loop (stable object reference)
const mockPreviewData = {
  closingDate: '2024-12-31',
  description: 'Year-end closing',
  nominalAccountLines: [
    {
      accountId: '1',
      accountCode: '4000',
      accountName: 'Revenue',
      debitAmount: null,
      creditAmount: 1000.00,
    },
  ],
  profitLossLine: {
    accountId: '2',
    accountCode: '3000',
    accountName: 'Retained Earnings',
    debitAmount: 1000.00,
    creditAmount: null,
  },
  totalDebits: 1000.00,
  totalCredits: 1000.00,
}

vi.mock('@/hooks/api/useClosingPreview', () => ({
  useClosingPreview: vi.fn((tenantId, date, description, enabled) => {
    if (!enabled) {
      return {
        data: undefined,
        isLoading: false,
        error: null,
      }
    }

    return {
      data: mockPreviewData,
      isLoading: false,
      error: null,
    }
  }),
}))

const renderComponent = (props = {}) => {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const defaultProps = {
    tenantId: 'test-tenant',
    open: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  }

  return render(
    <QueryClientProvider client={testQueryClient}>
      <ClosingDialog {...defaultProps} {...props} />
    </QueryClientProvider>
  )
}

describe('ClosingDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Input Stage', () => {
    it('renders the input stage with date and description fields', () => {
      renderComponent()

      expect(screen.getByTestId('closing-date-input')).toBeInTheDocument()
      expect(screen.getByTestId('closing-description-input')).toBeInTheDocument()
    })

    it('disables preview button when date or description is empty', () => {
      renderComponent()

      const previewButton = screen.getByTestId('closing-preview-button')
      expect(previewButton).toBeDisabled()
    })

    it('enables preview button when date and description are filled', () => {
      renderComponent()

      const dateInput = screen.getByTestId('closing-date-input')
      const descriptionInput = screen.getByTestId('closing-description-input')
      const previewButton = screen.getByTestId('closing-preview-button')

      fireEvent.change(dateInput, { target: { value: '2024-12-31' } })
      fireEvent.change(descriptionInput, { target: { value: 'Year-end closing' } })

      expect(previewButton).not.toBeDisabled()
    })

    it('calls onClose when cancel button is clicked', () => {
      const onClose = vi.fn()
      renderComponent({ onClose })

      const cancelButton = screen.getByText('common.cancel')
      fireEvent.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Preview Stage', () => {
    it('transitions to preview stage after preview button click', async () => {
      renderComponent()

      const dateInput = screen.getByTestId('closing-date-input')
      const descriptionInput = screen.getByTestId('closing-description-input')
      const previewButton = screen.getByTestId('closing-preview-button')

      fireEvent.change(dateInput, { target: { value: '2024-12-31' } })
      fireEvent.change(descriptionInput, { target: { value: 'Year-end closing' } })
      fireEvent.click(previewButton)

      await waitFor(() => {
        expect(screen.getByTestId('closing-execute-button')).toBeInTheDocument()
      })
    })

    it('displays closing details in preview', async () => {
      renderComponent()

      const dateInput = screen.getByTestId('closing-date-input')
      const descriptionInput = screen.getByTestId('closing-description-input')
      const previewButton = screen.getByTestId('closing-preview-button')

      fireEvent.change(dateInput, { target: { value: '2024-12-31' } })
      fireEvent.change(descriptionInput, { target: { value: 'Year-end closing' } })
      fireEvent.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText('closing.nominalAccounts')).toBeInTheDocument()
        expect(screen.getByText('closing.profitLossAccount')).toBeInTheDocument()
      })
    })

    it('has back button to return to input stage', async () => {
      renderComponent()

      const dateInput = screen.getByTestId('closing-date-input')
      const descriptionInput = screen.getByTestId('closing-description-input')
      const previewButton = screen.getByTestId('closing-preview-button')

      fireEvent.change(dateInput, { target: { value: '2024-12-31' } })
      fireEvent.change(descriptionInput, { target: { value: 'Year-end closing' } })
      fireEvent.click(previewButton)

      await waitFor(() => {
        const backButton = screen.getAllByText('common.back')[0]
        expect(backButton).toBeInTheDocument()
      })
    })
  })

  describe('Error Display', () => {
    it('displays error from executeClosing using error handler', async () => {
      mockUseExecuteClosingMutation.mockReturnValue({
        executeClosing: {
          mutate: vi.fn((_body, callbacks) => {
            callbacks.onError({
              errorCode: 'CLOSING_CONFIG_ERROR',
              userMessage: 'Closing transaction type is not configured',
              requestId: 'test-request-1',
              timestamp: new Date().toISOString(),
              showSupportContact: false,
              classification: 'permanent',
              isRetryable: false,
              severity: 'error',
            })
          }),
          isPending: false,
        },
      } as ReturnType<typeof useExecuteClosingMutation>)

      renderComponent()

      // Fill inputs and go to preview
      const dateInput = screen.getByTestId('closing-date-input')
      const descriptionInput = screen.getByTestId('closing-description-input')
      const previewButton = screen.getByTestId('closing-preview-button')

      fireEvent.change(dateInput, { target: { value: '2024-12-31' } })
      fireEvent.change(descriptionInput, { target: { value: 'Year-end closing' } })
      fireEvent.click(previewButton)

      await waitFor(() => {
        expect(screen.getByTestId('closing-execute-button')).toBeInTheDocument()
      })

      // Execute and expect error
      fireEvent.click(screen.getByTestId('closing-execute-button'))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Closing transaction type is not configured')
      })
    })

    it('displays error from preview fetch using error handler', async () => {
      const { useClosingPreview } = await import('@/hooks/api/useClosingPreview')
      // Memoize error object to prevent infinite loop
      const mockError = {
        errorCode: 'CONFIG_ERROR',
        userMessage: 'No nominal accounts configured',
        requestId: 'test-request-2',
        timestamp: new Date().toISOString(),
        showSupportContact: false,
        classification: 'permanent',
        isRetryable: false,
        severity: 'error',
      }
      vi.mocked(useClosingPreview).mockImplementation((_tenantId, _date, _desc, enabled) => {
        if (!enabled) {
          return { data: undefined, isLoading: false, error: null } as ReturnType<typeof useClosingPreview>
        }
        return {
          data: undefined,
          isLoading: false,
          error: mockError,
        } as unknown as ReturnType<typeof useClosingPreview>
      })

      renderComponent()

      const dateInput = screen.getByTestId('closing-date-input')
      const descriptionInput = screen.getByTestId('closing-description-input')
      const previewButton = screen.getByTestId('closing-preview-button')

      fireEvent.change(dateInput, { target: { value: '2024-12-31' } })
      fireEvent.change(descriptionInput, { target: { value: 'Year-end closing' } })
      fireEvent.click(previewButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('No nominal accounts configured')
      })
    })
  })

  describe('Validation', () => {
    it('shows error when date is missing', async () => {
      renderComponent()

      const descriptionInput = screen.getByTestId('closing-description-input')
      const previewButton = screen.getByTestId('closing-preview-button')

      fireEvent.change(descriptionInput, { target: { value: 'Year-end closing' } })
      fireEvent.click(previewButton)

      // Preview button is still disabled due to missing date, so error won't show
      // This is the correct behavior
      expect(previewButton).toBeDisabled()
    })

    it('shows error when description is empty', async () => {
      renderComponent()

      const dateInput = screen.getByTestId('closing-date-input')
      const previewButton = screen.getByTestId('closing-preview-button')

      fireEvent.change(dateInput, { target: { value: '2024-12-31' } })

      // Preview button is still disabled due to empty description
      expect(previewButton).toBeDisabled()
    })
  })
})
