import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import type { CustomPeriodType } from './CustomPeriodTypeDialog'
import { CustomPeriodTypeDialog } from './CustomPeriodTypeDialog'

describe('CustomPeriodTypeDialog', () => {
  const mockOnSave = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnSave.mockClear()
    mockOnClose.mockClear()
  })

  it('renders name input when open', () => {
    renderWithProviders(
      <CustomPeriodTypeDialog
        open={true}
        from="2026-01-01"
        to="2026-03-31"
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingNames={[]}
      />,
    )

    expect(screen.getByTestId('custom-period-type-name-input')).toBeInTheDocument()
  })

  it('does not render fields when closed', () => {
    renderWithProviders(
      <CustomPeriodTypeDialog
        open={false}
        from="2026-01-01"
        to="2026-03-31"
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingNames={[]}
      />,
    )

    expect(screen.queryByTestId('custom-period-type-name-input')).not.toBeInTheDocument()
  })

  it('saves custom period type with valid name', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <CustomPeriodTypeDialog
        open={true}
        from="2026-01-01"
        to="2026-03-31"
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingNames={[]}
      />,
    )

    const input = screen.getByTestId('custom-period-type-name-input')
    await user.type(input, 'Q1 2026')

    const saveButton = screen.getByTestId('custom-period-type-save-button')
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Q1 2026',
          from: '2026-01-01',
          to: '2026-03-31',
        }),
      )
    })

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('disables save button when name is empty', () => {
    renderWithProviders(
      <CustomPeriodTypeDialog
        open={true}
        from="2026-01-01"
        to="2026-03-31"
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingNames={[]}
      />,
    )

    const saveButton = screen.getByTestId('custom-period-type-save-button')
    expect(saveButton).toBeDisabled()
  })

  it('shows error when name already exists', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <CustomPeriodTypeDialog
        open={true}
        from="2026-01-01"
        to="2026-03-31"
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingNames={['Q1 2026']}
      />,
    )

    const input = screen.getByTestId('custom-period-type-name-input')
    await user.type(input, 'Q1 2026')

    const saveButton = screen.getByTestId('custom-period-type-save-button')
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('clears name on close', async () => {
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(
      <CustomPeriodTypeDialog
        open={true}
        from="2026-01-01"
        to="2026-03-31"
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingNames={[]}
      />,
    )

    const input = screen.getByTestId('custom-period-type-name-input')
    await user.type(input, 'Test Period')

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()

    // Reopen dialog
    mockOnClose.mockClear()
    rerender(
      <CustomPeriodTypeDialog
        open={true}
        from="2026-04-01"
        to="2026-06-30"
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingNames={[]}
      />,
    )

    const newInput = screen.getByTestId('custom-period-type-name-input') as HTMLInputElement
    expect(newInput.value).toBe('')
  })

  it('generates unique ID for saved period type', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <CustomPeriodTypeDialog
        open={true}
        from="2026-01-01"
        to="2026-03-31"
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingNames={[]}
      />,
    )

    const input = screen.getByTestId('custom-period-type-name-input')
    await user.type(input, 'Q1 2026')

    const saveButton = screen.getByTestId('custom-period-type-save-button')
    await user.click(saveButton)

    await waitFor(() => {
      const savedPeriod = mockOnSave.mock.calls[0][0] as CustomPeriodType
      expect(savedPeriod.id).toBeDefined()
      expect(savedPeriod.id.length).toBeGreaterThan(0)
    })
  })
})
