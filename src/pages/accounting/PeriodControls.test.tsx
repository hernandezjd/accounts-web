import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { PeriodControls } from './PeriodControls'
import type { CustomPeriodType } from './CustomPeriodTypeDialog'

const defaultProps = {
  from: '2026-01-01',
  to: '2026-01-31',
  granularity: 'monthly' as const,
  onPrevPeriod: vi.fn(),
  onNextPeriod: vi.fn(),
  onGranularityChange: vi.fn(),
}

describe('PeriodControls', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows formatted period label', () => {
    renderWithProviders(<PeriodControls {...defaultProps} />)
    expect(screen.getByText('January 2026')).toBeInTheDocument()
  })

  it('"Previous Period" button calls onPrevPeriod', () => {
    const onPrevPeriod = vi.fn()
    renderWithProviders(<PeriodControls {...defaultProps} onPrevPeriod={onPrevPeriod} />)
    fireEvent.click(screen.getByRole('button', { name: /previous period/i }))
    expect(onPrevPeriod).toHaveBeenCalledTimes(1)
  })

  it('"Next Period" button calls onNextPeriod', () => {
    const onNextPeriod = vi.fn()
    renderWithProviders(<PeriodControls {...defaultProps} onNextPeriod={onNextPeriod} />)
    fireEvent.click(screen.getByRole('button', { name: /next period/i }))
    expect(onNextPeriod).toHaveBeenCalledTimes(1)
  })

  it('granularity selector renders current granularity', () => {
    renderWithProviders(<PeriodControls {...defaultProps} granularity="quarterly" />)
    // Native select renders with the current value
    expect(screen.getByDisplayValue('Quarterly')).toBeInTheDocument()
  })

  it('selecting new granularity calls onGranularityChange', () => {
    const onGranularityChange = vi.fn()
    renderWithProviders(
      <PeriodControls {...defaultProps} onGranularityChange={onGranularityChange} />,
    )
    const select = screen.getByDisplayValue('Monthly')
    fireEvent.change(select, { target: { value: 'yearly' } })
    expect(onGranularityChange).toHaveBeenCalledWith('yearly')
  })

  it('allows switching from custom granularity to another granularity', () => {
    const onGranularityChange = vi.fn()
    const { rerender } = renderWithProviders(
      <PeriodControls
        {...defaultProps}
        granularity="custom"
        onGranularityChange={onGranularityChange}
      />,
    )
    // Should show the granularity selector even in custom mode
    const select = screen.getByDisplayValue('Custom')
    expect(select).toBeInTheDocument()

    // Change to weekly
    fireEvent.change(select, { target: { value: 'weekly' } })
    expect(onGranularityChange).toHaveBeenCalledWith('weekly')

    // Verify the parent updated the granularity
    rerender(
      <PeriodControls
        {...defaultProps}
        granularity="weekly"
        onGranularityChange={onGranularityChange}
      />,
    )
    expect(screen.getByDisplayValue('Weekly')).toBeInTheDocument()
  })

  it('shows custom period picker and delete menu when granularity is custom with saved periods', async () => {
    const customPeriod: CustomPeriodType = {
      id: 'test-1',
      name: 'Q1 2026',
      from: '2026-01-01',
      to: '2026-03-31',
    }
    window.localStorage.setItem(
      'accounting.customPeriodTypes',
      JSON.stringify([customPeriod]),
    )

    renderWithProviders(
      <PeriodControls {...defaultProps} granularity="custom" />,
    )

    // Should show the custom period type selector after loading from localStorage
    await waitFor(() => {
      expect(screen.getByTestId('custom-period-type-selector')).toBeInTheDocument()
    })
    // Should show the menu trigger button
    expect(screen.getByTestId('custom-period-delete-menu-trigger')).toBeInTheDocument()
  })

  it('opens delete menu when clicking menu trigger button', async () => {
    const customPeriod: CustomPeriodType = {
      id: 'test-1',
      name: 'Q1 2026',
      from: '2026-01-01',
      to: '2026-03-31',
    }
    window.localStorage.setItem(
      'accounting.customPeriodTypes',
      JSON.stringify([customPeriod]),
    )

    renderWithProviders(
      <PeriodControls {...defaultProps} granularity="custom" />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('custom-period-delete-menu-trigger')).toBeInTheDocument()
    })

    const menuTrigger = screen.getByTestId('custom-period-delete-menu-trigger')
    fireEvent.click(menuTrigger)

    // Menu should be visible
    expect(screen.getByTestId('custom-period-delete-menu')).toBeInTheDocument()
    // Menu item for the period should be visible
    expect(screen.getByText('Q1 2026')).toBeInTheDocument()
  })

  it('deletes custom period when delete button is clicked in menu', async () => {
    const customPeriod: CustomPeriodType = {
      id: 'test-1',
      name: 'Q1 2026',
      from: '2026-01-01',
      to: '2026-03-31',
    }
    window.localStorage.setItem(
      'accounting.customPeriodTypes',
      JSON.stringify([customPeriod]),
    )

    renderWithProviders(
      <PeriodControls {...defaultProps} granularity="custom" />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('custom-period-delete-menu-trigger')).toBeInTheDocument()
    })

    const menuTrigger = screen.getByTestId('custom-period-delete-menu-trigger')
    fireEvent.click(menuTrigger)

    const deleteButton = screen.getByTestId('delete-custom-period-test-1')
    fireEvent.click(deleteButton)

    // Verify the period was deleted from localStorage
    const stored = window.localStorage.getItem('accounting.customPeriodTypes')
    const periods = stored ? JSON.parse(stored) : []
    expect(periods).toHaveLength(0)
  })

  it('handles multiple custom periods and deletes the correct one', async () => {
    const periods: CustomPeriodType[] = [
      {
        id: 'test-1',
        name: 'Q1 2026',
        from: '2026-01-01',
        to: '2026-03-31',
      },
      {
        id: 'test-2',
        name: 'Q2 2026',
        from: '2026-04-01',
        to: '2026-06-30',
      },
    ]
    window.localStorage.setItem(
      'accounting.customPeriodTypes',
      JSON.stringify(periods),
    )

    renderWithProviders(
      <PeriodControls {...defaultProps} granularity="custom" />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('custom-period-delete-menu-trigger')).toBeInTheDocument()
    })

    const menuTrigger = screen.getByTestId('custom-period-delete-menu-trigger')
    fireEvent.click(menuTrigger)

    // Delete the first period
    const deleteButton = screen.getByTestId('delete-custom-period-test-1')
    fireEvent.click(deleteButton)

    // Verify only the second period remains
    const stored = window.localStorage.getItem('accounting.customPeriodTypes')
    const remainingPeriods = stored ? JSON.parse(stored) : []
    expect(remainingPeriods).toHaveLength(1)
    expect(remainingPeriods[0].id).toBe('test-2')
  })
})
