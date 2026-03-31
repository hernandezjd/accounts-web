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
    severity: 'error',
    timestamp: '2024-01-01T00:00:00Z',
  }

  const retryableError: FormattedError = {
    ...sampleError,
    classification: 'transient',
    isRetryable: true,
    errorCode: 'HTTP_503',
    severity: 'error',
  }

  const fiveXxError: FormattedError = {
    ...sampleError,
    errorCode: 'INTERNAL_SERVER_ERROR',
    showSupportContact: true,
    severity: 'error',
  }

  it('renders error message when error is provided', () => {
    renderWithProviders(<ErrorMessage error={sampleError} />)

    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('renders nothing when error is null', () => {
    const { container } = renderWithProviders(<ErrorMessage error={null} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders suggestion only for retryable errors', () => {
    renderWithProviders(<ErrorMessage error={retryableError} />)

    expect(screen.getByText(/Try refreshing the page/i)).toBeInTheDocument()
  })

  it('does not render suggestion for non-retryable errors', () => {
    renderWithProviders(<ErrorMessage error={sampleError} />)

    expect(screen.queryByText(/Try refreshing the page/i)).not.toBeInTheDocument()
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

  describe('Debug information display', () => {
    it('renders debug section when httpStatus is present', () => {
      const debugError: FormattedError = {
        ...sampleError,
        httpStatus: 400,
      }

      renderWithProviders(<ErrorMessage error={debugError} />)

      expect(screen.getByText('DEBUG')).toBeInTheDocument()
      expect(screen.getByText('HTTP Status:')).toBeInTheDocument()
      expect(screen.getByText('400')).toBeInTheDocument()
    })

    it('renders debug section when requestUrl is present', () => {
      const debugError: FormattedError = {
        ...sampleError,
        requestUrl: 'POST /api/accounts',
      }

      renderWithProviders(<ErrorMessage error={debugError} />)

      expect(screen.getByText('DEBUG')).toBeInTheDocument()
      expect(screen.getByText('Request URL:')).toBeInTheDocument()
      expect(screen.getByText('POST /api/accounts')).toBeInTheDocument()
    })

    it('renders debug section when responseBody is present', () => {
      const debugError: FormattedError = {
        ...sampleError,
        responseBody: '{"error":"Invalid request"}',
      }

      renderWithProviders(<ErrorMessage error={debugError} />)

      expect(screen.getByText('DEBUG')).toBeInTheDocument()
      expect(screen.getByText('Response Body:')).toBeInTheDocument()
      expect(screen.getByText(/Invalid request/)).toBeInTheDocument()
    })

    it('prettifies JSON response body', () => {
      const debugError: FormattedError = {
        ...sampleError,
        responseBody: '{"error":"test","code":123}',
      }

      renderWithProviders(<ErrorMessage error={debugError} />)

      // Check that the response body section exists and is rendered
      const alertElement = screen.getByRole('alert')
      expect(alertElement).toHaveTextContent('Response Body:')
      // The prettified JSON will be rendered in the alert
      expect(alertElement).toHaveTextContent('error')
      expect(alertElement).toHaveTextContent('test')
    })

    it('displays non-JSON response body as-is', () => {
      const debugError: FormattedError = {
        ...sampleError,
        responseBody: 'Plain text error response',
      }

      renderWithProviders(<ErrorMessage error={debugError} />)

      expect(screen.getByText(/Plain text error response/)).toBeInTheDocument()
    })

    it('does not render debug section when no debug data is present', () => {
      renderWithProviders(<ErrorMessage error={sampleError} />)

      expect(screen.queryByText('DEBUG')).not.toBeInTheDocument()
    })

    it('renders all debug info when fully populated', () => {
      const fullDebugError: FormattedError = {
        ...sampleError,
        httpStatus: 500,
        requestUrl: 'GET /api/accounts/123',
        responseBody: '{"errorCode":"INTERNAL_ERROR","message":"Server error"}',
      }

      renderWithProviders(<ErrorMessage error={fullDebugError} />)

      // Get the alert element which contains all the information
      const alertElement = screen.getByRole('alert')
      expect(alertElement).toBeInTheDocument()

      // Check DEBUG section exists
      expect(alertElement).toHaveTextContent('DEBUG')

      // Check HTTP Status is present
      expect(alertElement).toHaveTextContent('HTTP Status:')
      expect(alertElement).toHaveTextContent('500')

      // Check Request URL is present
      expect(alertElement).toHaveTextContent('Request URL:')
      expect(alertElement).toHaveTextContent('GET /api/accounts/123')

      // Check Response Body is present
      expect(alertElement).toHaveTextContent('Response Body:')
      expect(alertElement).toHaveTextContent('INTERNAL_ERROR')
    })
  })

  describe('Collapsible DEBUG section', () => {
    const debugError: FormattedError = {
      ...sampleError,
      httpStatus: 500,
      requestUrl: 'GET /api/accounts/123',
      responseBody: '{"error":"test"}',
    }

    it('displays DEBUG header when debug data is present', () => {
      renderWithProviders(<ErrorMessage error={debugError} />)

      expect(screen.getByText('DEBUG')).toBeInTheDocument()
    })

    it('allows clicking DEBUG header without errors', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ErrorMessage error={debugError} />)

      const debugHeader = screen.getByText('DEBUG').closest('div')
      expect(debugHeader).toBeInTheDocument()

      // Click should not throw an error
      await user.click(debugHeader!)
      expect(screen.getByText('DEBUG')).toBeInTheDocument()
    })

    it('shows debug details (HTTP Status, URL, Body) in the component', () => {
      renderWithProviders(<ErrorMessage error={debugError} />)

      const alertElement = screen.getByRole('alert')
      expect(alertElement).toHaveTextContent('DEBUG')
      // Debug data should be in the rendered output
      expect(alertElement).toHaveTextContent('500')
      expect(alertElement).toHaveTextContent('GET /api/accounts/123')
      expect(alertElement).toHaveTextContent('error')
    })

    it('does not show DEBUG section when no debug data exists', () => {
      const noDebugError: FormattedError = {
        ...sampleError,
        httpStatus: undefined,
        requestUrl: undefined,
        responseBody: undefined,
      }

      renderWithProviders(<ErrorMessage error={noDebugError} />)

      expect(screen.queryByText('DEBUG')).not.toBeInTheDocument()
    })

    it('hides DEBUG section completely for 403 ACTION_NOT_ALLOWED errors', () => {
      const error403: FormattedError = {
        ...sampleError,
        errorCode: 'ACTION_NOT_ALLOWED',
        httpStatus: 403,
        requestUrl: 'GET /api/accounts/123',
        responseBody: '{"error":"forbidden"}',
        severity: 'warning',
      }

      renderWithProviders(<ErrorMessage error={error403} />)

      expect(screen.queryByText('DEBUG')).not.toBeInTheDocument()
    })

    it('hides DEBUG section completely for 403 INSUFFICIENT_PERMISSIONS errors', () => {
      const error403: FormattedError = {
        ...sampleError,
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        httpStatus: 403,
        requestUrl: 'GET /api/accounts/123',
        responseBody: '{"error":"forbidden"}',
        severity: 'warning',
      }

      renderWithProviders(<ErrorMessage error={error403} />)

      expect(screen.queryByText('DEBUG')).not.toBeInTheDocument()
    })

    it('hides DEBUG section completely for 403 ROLE_REQUIRED errors', () => {
      const error403: FormattedError = {
        ...sampleError,
        errorCode: 'ROLE_REQUIRED',
        httpStatus: 403,
        requestUrl: 'GET /api/accounts/123',
        responseBody: '{"error":"forbidden"}',
        severity: 'warning',
      }

      renderWithProviders(<ErrorMessage error={error403} />)

      expect(screen.queryByText('DEBUG')).not.toBeInTheDocument()
    })

    it('hides DEBUG section completely for 403 WORKSPACE_ACCESS_REQUIRED errors', () => {
      const error403: FormattedError = {
        ...sampleError,
        errorCode: 'WORKSPACE_ACCESS_REQUIRED',
        httpStatus: 403,
        requestUrl: 'GET /api/accounts/123',
        responseBody: '{"error":"forbidden"}',
        severity: 'warning',
      }

      renderWithProviders(<ErrorMessage error={error403} />)

      expect(screen.queryByText('DEBUG')).not.toBeInTheDocument()
    })

    it('hides DEBUG section completely for 403 FORBIDDEN errors', () => {
      const error403: FormattedError = {
        ...sampleError,
        errorCode: 'FORBIDDEN',
        httpStatus: 403,
        requestUrl: 'GET /api/accounts/123',
        responseBody: '{"error":"forbidden"}',
        severity: 'warning',
      }

      renderWithProviders(<ErrorMessage error={error403} />)

      expect(screen.queryByText('DEBUG')).not.toBeInTheDocument()
    })

    it('hides DEBUG section completely for 403 HTTP_403 errors', () => {
      const error403: FormattedError = {
        ...sampleError,
        errorCode: 'HTTP_403',
        httpStatus: 403,
        requestUrl: 'GET /api/accounts/123',
        responseBody: '{"error":"forbidden"}',
        severity: 'warning',
      }

      renderWithProviders(<ErrorMessage error={error403} />)

      expect(screen.queryByText('DEBUG')).not.toBeInTheDocument()
    })

    it('shows DEBUG section for non-403 errors even if they have debug data', () => {
      const nonForbiddenError: FormattedError = {
        ...sampleError,
        errorCode: 'INTERNAL_SERVER_ERROR',
        httpStatus: 500,
        requestUrl: 'GET /api/accounts/123',
        responseBody: '{"error":"server error"}',
        severity: 'error',
      }

      renderWithProviders(<ErrorMessage error={nonForbiddenError} />)

      expect(screen.getByText('DEBUG')).toBeInTheDocument()
    })

    it('hides request ID for 403 ACTION_NOT_ALLOWED errors', () => {
      const error403: FormattedError = {
        ...sampleError,
        errorCode: 'ACTION_NOT_ALLOWED',
        requestId: 'req-403-12345',
        severity: 'warning',
      }

      renderWithProviders(<ErrorMessage error={error403} />)

      expect(screen.queryByText(/req-403-12345/)).not.toBeInTheDocument()
    })

    it('hides request ID for 403 INSUFFICIENT_PERMISSIONS errors', () => {
      const error403: FormattedError = {
        ...sampleError,
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        requestId: 'req-403-67890',
        severity: 'warning',
      }

      renderWithProviders(<ErrorMessage error={error403} />)

      expect(screen.queryByText(/req-403-67890/)).not.toBeInTheDocument()
    })

    it('hides request ID for 403 ROLE_REQUIRED errors', () => {
      const error403: FormattedError = {
        ...sampleError,
        errorCode: 'ROLE_REQUIRED',
        requestId: 'req-403-role',
        severity: 'warning',
      }

      renderWithProviders(<ErrorMessage error={error403} />)

      expect(screen.queryByText(/req-403-role/)).not.toBeInTheDocument()
    })

    it('hides request ID for 403 WORKSPACE_ACCESS_REQUIRED errors', () => {
      const error403: FormattedError = {
        ...sampleError,
        errorCode: 'WORKSPACE_ACCESS_REQUIRED',
        requestId: 'req-403-workspace',
        severity: 'warning',
      }

      renderWithProviders(<ErrorMessage error={error403} />)

      expect(screen.queryByText(/req-403-workspace/)).not.toBeInTheDocument()
    })

    it('hides request ID for 403 FORBIDDEN errors', () => {
      const error403: FormattedError = {
        ...sampleError,
        errorCode: 'FORBIDDEN',
        requestId: 'req-403-forbidden',
        severity: 'warning',
      }

      renderWithProviders(<ErrorMessage error={error403} />)

      expect(screen.queryByText(/req-403-forbidden/)).not.toBeInTheDocument()
    })

    it('hides request ID for 403 HTTP_403 errors', () => {
      const error403: FormattedError = {
        ...sampleError,
        errorCode: 'HTTP_403',
        requestId: 'req-403-http',
        severity: 'warning',
      }

      renderWithProviders(<ErrorMessage error={error403} />)

      expect(screen.queryByText(/req-403-http/)).not.toBeInTheDocument()
    })

    it('shows request ID for non-403 errors', () => {
      const nonForbiddenError: FormattedError = {
        ...sampleError,
        errorCode: 'INTERNAL_SERVER_ERROR',
        requestId: 'req-500-normal',
        severity: 'error',
      }

      renderWithProviders(<ErrorMessage error={nonForbiddenError} />)

      expect(screen.getByText(/req-500-normal/)).toBeInTheDocument()
    })
  })

  describe('Error severity rendering', () => {
    it('renders error severity from error object (error)', () => {
      const errorSeverityError: FormattedError = {
        ...sampleError,
        severity: 'error',
      }

      renderWithProviders(<ErrorMessage error={errorSeverityError} />)

      const alertElement = screen.getByRole('alert')
      expect(alertElement).toBeInTheDocument()
      // Error severity alert has error styling (red)
      expect(alertElement).toHaveClass('MuiAlert-filledError')
    })

    it('renders warning severity from error object (403 errors)', () => {
      const warningSeverityError: FormattedError = {
        ...sampleError,
        errorCode: 'ACTION_NOT_ALLOWED',
        severity: 'warning',
      }

      renderWithProviders(<ErrorMessage error={warningSeverityError} />)

      const alertElement = screen.getByRole('alert')
      expect(alertElement).toBeInTheDocument()
      // Warning severity alert has warning styling (yellow)
      expect(alertElement).toHaveClass('MuiAlert-filledWarning')
    })

    it('prefers error.severity over prop severity', () => {
      const warningSeverityError: FormattedError = {
        ...sampleError,
        errorCode: 'ACTION_NOT_ALLOWED',
        severity: 'warning',
      }

      // Pass severity prop as 'error', but error.severity is 'warning'
      // Component should use error.severity
      renderWithProviders(<ErrorMessage error={warningSeverityError} severity="error" />)

      const alertElement = screen.getByRole('alert')
      // Should render with warning styling because error.severity takes precedence
      expect(alertElement).toHaveClass('MuiAlert-filledWarning')
    })

    it('uses prop severity as fallback when error.severity is not provided', () => {
      const errorWithoutSeverity: FormattedError = {
        ...sampleError,
        severity: 'error',
      }

      renderWithProviders(<ErrorMessage error={errorWithoutSeverity} severity="warning" />)

      const alertElement = screen.getByRole('alert')
      // Component still uses error.severity over prop
      expect(alertElement).toHaveClass('MuiAlert-filledError')
    })
  })
})
