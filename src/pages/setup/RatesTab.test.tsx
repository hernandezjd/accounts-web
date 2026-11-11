import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockMutation, mockQuery } from '@/test-utils/mockReactQuery'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { RatesTab } from './RatesTab'

vi.mock('@/hooks/api/useExchangeRates', () => ({
  useExchangeRates: vi.fn(),
  useRateSources: vi.fn(),
  useRateJobRuns: vi.fn(),
  useExchangeRateMutations: vi.fn(),
}))

import {
  useExchangeRateMutations,
  useExchangeRates,
  useRateJobRuns,
  useRateSources,
} from '@/hooks/api/useExchangeRates'

const putRate = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useExchangeRates).mockReturnValue(
    mockQuery({
      data: [
        { id: 'r-1', baseCurrency: 'CAD', currency: 'COP', rateDate: '2026-11-10', rate: 0.00038, source: 'MANUAL' },
        { id: 'r-2', baseCurrency: 'CAD', currency: 'USD', rateDate: '2026-11-10', rate: 1.37, source: 'MANUAL' },
      ],
    }) as ReturnType<typeof useExchangeRates>,
  )
  vi.mocked(useRateSources).mockReturnValue(mockQuery({ data: [] }) as ReturnType<typeof useRateSources>)
  vi.mocked(useRateJobRuns).mockReturnValue(mockQuery({ data: [] }) as ReturnType<typeof useRateJobRuns>)
  vi.mocked(useExchangeRateMutations).mockReturnValue({
    putRate: mockMutation({ mutate: putRate }),
    createSource: mockMutation(),
    updateSource: mockMutation(),
    deleteSource: mockMutation(),
    runJob: mockMutation(),
  } as unknown as ReturnType<typeof useExchangeRateMutations>)
})

async function fillManualRate(currency: string, rate: string) {
  await userEvent.type(screen.getByTestId('manual-rate-base'), 'CAD')
  await userEvent.type(screen.getByTestId('manual-rate-currency'), currency)
  await userEvent.type(screen.getByTestId('manual-rate-date'), '2026-11-11')
  await userEvent.type(screen.getByTestId('manual-rate-input'), rate)
}

describe('RatesTab', () => {
  it('shows each rate in its readable direction', () => {
    renderWithProviders(<RatesTab />)

    const table = within(screen.getByTestId('rates-table'))
    // 1 / 0.00038 = 2,631.5789
    expect(table.getByText('1 CAD = 2,631.5789 COP')).toBeInTheDocument()
    expect(table.getByText('1 USD = 1.37 CAD')).toBeInTheDocument()
  })

  it('takes a rate below 1 the other way round and saves it in the stored direction', async () => {
    renderWithProviders(<RatesTab />)
    await fillManualRate('COP', '2500')

    expect(screen.getByText('COP per 1 CAD')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('save-rate-btn'))

    // 2,500 COP per 1 CAD = 1 / 2,500 = 0.0004 CAD per 1 COP
    expect(putRate.mock.calls[0][0]).toEqual({
      baseCurrency: 'CAD',
      currency: 'COP',
      rateDate: '2026-11-11',
      rate: 0.0004,
    })
  })

  it('takes a rate of 1 or more as stored, and the direction can be switched', async () => {
    renderWithProviders(<RatesTab />)
    await fillManualRate('USD', '1.25')

    expect(screen.getByText('CAD per 1 USD')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('manual-rate-direction-toggle'))
    expect(screen.getByText('USD per 1 CAD')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('save-rate-btn'))

    // 1.25 USD per 1 CAD = 1 / 1.25 = 0.8 CAD per 1 USD
    expect(putRate.mock.calls[0][0].rate).toBe(0.8)
  })
})
