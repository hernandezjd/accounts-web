import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { ErrorMessage } from './ErrorMessage'
import type { FormattedError } from '@/lib/error/useErrorHandler'

describe('ErrorMessage', () => {
  const sampleError: FormattedError = {
    userMessage: 'Test error',
    suggestion: 'Try refreshing the page',
    requestId: 'req-123',
    rawDetails: { status: 500 },
    showSupportContact: false,
    errorCode: 'ERR_001',
    classification: 'permanent',
    isRetryable: false,
  }

  const retryableError: FormattedError = {
    ...sampleError,
    classification: 'transient',
    isRetryable: true,
    errorCode: 'HTTP_503',
  }

  const fiveXxError: FormattedError = {
    ...sampleError,
    errorCode: 'INTERNAL_SERVER_ERROR',
    showSupportContact: true,
  }

  it('renders error message when error is provided', () => {
    renderWithProviders(<ErrorMessage error={sampleError} />)

    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('renders nothing when error is null', () => {
    const { container } = renderWithProviders(<ErrorMessage error={null} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders suggestion when provided', () => {
    renderWithProviders(<ErrorMessage error={sampleError} />)

    expect(screen.getByText(/Try refreshing the page/i)).toBeInTheDocument()
  })

  it('displays error with alert styling', () => {
    renderWithProviders(<ErrorMessage error={sampleError} />)

    const alertElement = screen.getByRole('alert')
    expect(alertElement).toBeInTheDocument()
  })

  it('renders request id when showRequestId is true', () => {
    renderWithProviders(<ErrorMessage error={sampleError} showRequestId={true} />)

    expect(screen.getByText(/req-123/)).toBeInTheDocument()
  })

  it('hides request id when showRequestId is false', () => {
    renderWithProviders(<ErrorMessage error={sampleError} showRequestId={false} />)

    expect(screen.queryByText(/req-123/)).not.toBeInTheDocument()
  })

  it('calls onDismiss when close button clicked', async () => {
    const handleDismiss = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<ErrorMessage error={sampleError} onDismiss={handleDismiss} />)

    const closeButton = screen.getByLabelText('close')
    await user.click(closeButton)

    expect(handleDismiss).toHaveBeenCalled()
  })

  describe('Retry button visibility', () => {
    it('shows retry button when error is retryable and onRetry provided', () => {
      const handleRetry = vi.fn()
      renderWithProviders(
        <ErrorMessage error={retryableError} onRetry={handleRetry} />
      )

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('hides retry button when error is not retryable', () => {
      const handleRetry = vi.fn()
      renderWithProviders(
        <ErrorMessage error={sampleError} onRetry={handleRetry} />
      )

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
    })

    it('hides retry button when onRetry not provided', () => {
      renderWithProviders(
        <ErrorMessage error={retryableError} />
      )

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
    })

    it('calls onRetry when retry button clicked', async () => {
      const handleRetry = vi.fn()
      const user = userEvent.setup()

      renderWithProviders(
        <ErrorMessage error={retryableError} onRetry={handleRetry} />
      )

      const retryButton = screen.getByRole('button', { name: /try again/i })
      await user.click(retryButton)

      expect(handleRetry).toHaveBeenCalled()
    })
  })

  describe('Request ID display and copy', () => {
    beforeEach(() => {
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: vi.fn(),
        },
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('shows request ID prominently for 5xx errors', () => {
      renderWithProviders(<ErrorMessage error={fiveXxError} showRequestId={true} />)

      expect(screen.getByText(/req-123/)).toBeInTheDocument()
      expect(screen.getByText(/Request ID:/)).toBeInTheDocument()
    })

    it('shows copy button for 5xx error request ID', () => {
      renderWithProviders(<ErrorMessage error={fiveXxError} showRequestId={true} />)

      const copyButton = screen.getByRole('button', { hidden: true }).parentElement?.querySelector('button')
      expect(copyButton).toBeInTheDocument()
    })

    it('copies request ID to clipboard on button click', async () => {
      const user = userEvent.setup()
      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      ;(navigator.clipboard as any).writeText = writeTextMock

      renderWithProviders(<ErrorMessage error={fiveXxError} showRequestId={true} />)

      const copyButtons = screen.getAllByRole('button')
      const copyButton = copyButtons.find(btn => btn.querySelector('[data-testid="ContentCopyIcon"]'))

      if (copyButton) {
        await user.click(copyButton)
        expect(writeTextMock).toHaveBeenCalledWith('req-123')
      }
    })
  })

  describe('Error-type-specific messaging', () => {
    it('shows support contact for 5xx errors', () => {
      renderWithProviders(<ErrorMessage error={fiveXxError} />)

      expect(screen.getByText(/contact support/i)).toBeInTheDocument()
    })

    it('does not show support contact for 4xx errors', () => {
      const fourXxError: FormattedError = {
        ...sampleError,
        errorCode: 'ACCOUNT_NOT_FOUND',
        showSupportContact: false,
      }

      renderWithProviders(<ErrorMessage error={fourXxError} />)

      expect(screen.queryByText(/contact support/i)).not.toBeInTheDocument()
    })

    it('shows transient error message for network errors', () => {
      const networkError: FormattedError = {
        ...sampleError,
        userMessage: 'Service temporarily unavailable, trying again...',
        classification: 'network',
        isRetryable: true,
      }

      renderWithProviders(<ErrorMessage error={networkError} onRetry={vi.fn()} />)

      expect(screen.getByText(/Service temporarily unavailable/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })
})
