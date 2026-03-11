import { describe, it, expect, vi } from 'vitest'
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
})
