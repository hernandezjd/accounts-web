import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { PrefilledChartsTab } from './PrefilledChartsTab'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: () => ({ tenantId: 'tenant-1' }) }
})

vi.mock('@/hooks/api/usePrefilledCharts', () => ({
  usePrefilledCharts: vi.fn(),
  usePrefilledChartDetail: vi.fn(),
  useMergePrefilledChart: vi.fn(),
}))

import {
  usePrefilledCharts,
  usePrefilledChartDetail,
  useMergePrefilledChart,
} from '@/hooks/api/usePrefilledCharts'

const mockUsePrefilledCharts = vi.mocked(usePrefilledCharts)
const mockUsePrefilledChartDetail = vi.mocked(usePrefilledChartDetail)
const mockUseMergePrefilledChart = vi.mocked(useMergePrefilledChart)

const sampleCharts = [
  { id: 'es-pgc', name: 'PGC', description: 'Spanish chart', accountCount: 120 },
  { id: 'fr-pcg', name: 'PCG', description: 'French chart', accountCount: 100 },
]

const sampleDetail = {
  id: 'es-pgc',
  name: 'PGC',
  description: 'Spanish chart',
  accounts: [
    { code: '1', name: 'Group 1' },
    { code: '10', name: 'Subgroup 10' },
  ],
}

const mockMergeAsync = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  mockUsePrefilledCharts.mockReturnValue({
    data: sampleCharts,
    isLoading: false,
    error: null,
  } as ReturnType<typeof usePrefilledCharts>)

  mockUsePrefilledChartDetail.mockReturnValue({
    data: undefined,
  } as ReturnType<typeof usePrefilledChartDetail>)

  mockUseMergePrefilledChart.mockReturnValue({
    mutateAsync: mockMergeAsync,
    isPending: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useMergePrefilledChart>)
})

describe('PrefilledChartsTab', () => {
  it('renders template list', () => {
    renderWithProviders(<PrefilledChartsTab />)

    expect(screen.getByText('PGC')).toBeInTheDocument()
    expect(screen.getByText('PCG')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUsePrefilledCharts.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof usePrefilledCharts>)

    renderWithProviders(<PrefilledChartsTab />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockUsePrefilledCharts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('fail'),
    } as ReturnType<typeof usePrefilledCharts>)

    renderWithProviders(<PrefilledChartsTab />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('opens view dialog with accounts', async () => {
    mockUsePrefilledChartDetail.mockReturnValue({
      data: sampleDetail,
    } as ReturnType<typeof usePrefilledChartDetail>)

    renderWithProviders(<PrefilledChartsTab />)

    await userEvent.click(screen.getByTestId('view-es-pgc'))

    await waitFor(() => {
      expect(screen.getByText('Group 1')).toBeInTheDocument()
      expect(screen.getByText('Subgroup 10')).toBeInTheDocument()
    })
  })

  it('opens merge confirmation and shows report on success', async () => {
    const mockReport = {
      prefilledChartId: 'es-pgc',
      totalAccounts: 3,
      mergedCount: 2,
      skippedCount: 1,
      merged: [
        { code: '1', name: 'Group 1', accountId: 'a1' },
        { code: '10', name: 'Subgroup 10', accountId: 'a2' },
      ],
      skipped: [{ code: '100', name: 'Account 100', reason: 'already exists' }],
    }
    mockMergeAsync.mockResolvedValue(mockReport)

    renderWithProviders(<PrefilledChartsTab />)

    // Click merge button
    await userEvent.click(screen.getByTestId('merge-es-pgc'))

    // Confirmation dialog appears
    expect(screen.getByTestId('confirm-merge')).toBeInTheDocument()

    // Confirm merge
    await userEvent.click(screen.getByTestId('confirm-merge'))

    // Report dialog shows
    await waitFor(() => {
      expect(screen.getByText('already exists')).toBeInTheDocument()
    })
  })
})
