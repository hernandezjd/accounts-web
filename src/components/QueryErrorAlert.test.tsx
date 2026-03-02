import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { QueryErrorAlert } from './QueryErrorAlert'

describe('QueryErrorAlert', () => {
  it('renders the error message', () => {
    renderWithProviders(<QueryErrorAlert message="Failed to load data." />)
    expect(screen.getByText('Failed to load data.')).toBeInTheDocument()
  })

  it('does not render retry button when onRetry is not provided', () => {
    renderWithProviders(<QueryErrorAlert message="Error" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders retry button when onRetry is provided', () => {
    const onRetry = vi.fn()
    renderWithProviders(<QueryErrorAlert message="Error" onRetry={onRetry} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderWithProviders(<QueryErrorAlert message="Error" onRetry={onRetry} />)
    await user.click(screen.getByRole('button'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
