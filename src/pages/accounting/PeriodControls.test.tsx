import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { PeriodControls } from './PeriodControls'

const defaultProps = {
  from: '2026-01-01',
  to: '2026-01-31',
  granularity: 'monthly' as const,
  onPrevPeriod: vi.fn(),
  onNextPeriod: vi.fn(),
  onGranularityChange: vi.fn(),
}

describe('PeriodControls', () => {
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
})
