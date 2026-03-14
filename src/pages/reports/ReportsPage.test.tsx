import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { ReportsPage } from './ReportsPage'

// ─── Mock hooks ──────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useParams: vi.fn().mockReturnValue({ tenantId: 'tenant-test' }) }
})

vi.mock('@/hooks/api/usePeriodReport', () => ({
  usePeriodReport: vi.fn(),
}))

vi.mock('@/hooks/api/useBalanceAtLevel', () => ({
  useBalanceAtLevel: vi.fn(),
}))

import { usePeriodReport } from '@/hooks/api/usePeriodReport'
import { useBalanceAtLevel } from '@/hooks/api/useBalanceAtLevel'

const mockUsePeriodReport = vi.mocked(usePeriodReport)
const mockUseBalanceAtLevel = vi.mocked(useBalanceAtLevel)

// ─── Sample data ─────────────────────────────────────────────────────────────

const samplePeriodReport = {
  fromDate: '2026-01-01',
  toDate: '2026-01-31',
  entries: [
    {
      accountId: 'acc-1',
      accountCode: '100',
      accountName: 'Assets',
      level: 1,
      openingBalance: 5000,
      periodTransactions: [
        {
          transactionId: 'txn-1',
          transactionNumber: 'JE-001',
          transactionTypeName: 'Journal Entry',
          date: '2026-01-10',
          description: 'Test entry',
          debitAmount: 1000,
          creditAmount: 0,
        },
      ],
      closingBalance: 6000,
    },
    {
      accountId: 'acc-2',
      accountCode: '200',
      accountName: 'Liabilities',
      level: 1,
      openingBalance: -3000,
      periodTransactions: [],
      closingBalance: -3000,
    },
  ],
}

const sampleBalanceAtLevel = [
  {
    accountId: 'acc-3',
    accountCode: '110',
    accountName: 'Cash',
    level: 2,
    asOfDate: '2026-01-31',
    initialBalance: 1000,
    runningBalance: 500,
    totalBalance: 1500,
  },
]

// ─── Default mocks return idle state ─────────────────────────────────────────

const idlePeriodReport = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
} as ReturnType<typeof usePeriodReport>

const idleBalanceAtLevel = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
} as ReturnType<typeof useBalanceAtLevel>

beforeEach(() => {
  vi.clearAllMocks()
  mockUsePeriodReport.mockReturnValue(idlePeriodReport)
  mockUseBalanceAtLevel.mockReturnValue(idleBalanceAtLevel)
})

// ─── Helper to render and switch to a tab ────────────────────────────────────

async function renderOnTab(tabTestId: string) {
  renderWithProviders(<ReportsPage />)
  if (tabTestId !== 'tab-period-report') {
    await userEvent.click(screen.getByTestId(tabTestId))
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ReportsPage', () => {
  describe('Navigation tabs', () => {
    it('renders three tabs', () => {
      renderWithProviders(<ReportsPage />)

      expect(screen.getByTestId('tab-period-report')).toBeInTheDocument()
      expect(screen.getByTestId('tab-balance-at-date')).toBeInTheDocument()
      expect(screen.getByTestId('tab-balance-at-level')).toBeInTheDocument()
    })

    it('shows Period Report tab by default', () => {
      renderWithProviders(<ReportsPage />)

      expect(screen.getByTestId('period-from-date')).toBeInTheDocument()
      expect(screen.getByTestId('period-to-date')).toBeInTheDocument()
    })

    it('switches to Balance at Date tab', async () => {
      await renderOnTab('tab-balance-at-date')

      await waitFor(() => {
        expect(screen.getByTestId('balance-date')).toBeInTheDocument()
      })
    })

    it('switches to Balance at Level tab', async () => {
      await renderOnTab('tab-balance-at-level')

      await waitFor(() => {
        expect(screen.getByTestId('level-date')).toBeInTheDocument()
        expect(screen.getByTestId('level-input')).toBeInTheDocument()
      })
    })
  })

  describe('Period Report tab (Tab 1)', () => {
    it('renders form controls', () => {
      renderWithProviders(<ReportsPage />)

      expect(screen.getByTestId('period-from-date')).toBeInTheDocument()
      expect(screen.getByTestId('period-to-date')).toBeInTheDocument()
      expect(screen.getByTestId('period-level')).toBeInTheDocument()
      expect(screen.getByTestId('run-period-report-btn')).toBeInTheDocument()
    })

    it('Run button is disabled when dates are empty', () => {
      renderWithProviders(<ReportsPage />)

      expect(screen.getByTestId('run-period-report-btn')).toBeDisabled()
    })

    it('shows loading state', () => {
      mockUsePeriodReport.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      } as ReturnType<typeof usePeriodReport>)

      renderWithProviders(<ReportsPage />)

      expect(screen.getByText(/loading period report/i)).toBeInTheDocument()
    })

    it('shows error state', () => {
      mockUsePeriodReport.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('fail'),
      } as ReturnType<typeof usePeriodReport>)

      renderWithProviders(<ReportsPage />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('shows empty state when no data', () => {
      mockUsePeriodReport.mockReturnValue({
        data: { fromDate: '2026-01-01', toDate: '2026-01-31', entries: [] },
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof usePeriodReport>)

      renderWithProviders(<ReportsPage />)

      expect(screen.getByText(/no accounts found for the selected parameters/i)).toBeInTheDocument()
    })

    it('renders period report table with correct columns', () => {
      mockUsePeriodReport.mockReturnValue({
        data: samplePeriodReport,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof usePeriodReport>)

      renderWithProviders(<ReportsPage />)

      expect(screen.getByTestId('period-report-table')).toBeInTheDocument()
      expect(screen.getByText('Code')).toBeInTheDocument()
      expect(screen.getByText('Account Name')).toBeInTheDocument()
      expect(screen.getByText('Level')).toBeInTheDocument()
      expect(screen.getByText('Opening Balance')).toBeInTheDocument()
      expect(screen.getByText('Transactions')).toBeInTheDocument()
      expect(screen.getByText('Closing Balance')).toBeInTheDocument()
    })

    it('renders period report data rows', () => {
      mockUsePeriodReport.mockReturnValue({
        data: samplePeriodReport,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof usePeriodReport>)

      renderWithProviders(<ReportsPage />)

      expect(screen.getByTestId('period-row-acc-1')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('Assets')).toBeInTheDocument()
      expect(screen.getByTestId('period-row-acc-2')).toBeInTheDocument()
      expect(screen.getByText('200')).toBeInTheDocument()
      expect(screen.getByText('Liabilities')).toBeInTheDocument()
    })

    it('expands row to show transactions on click', async () => {
      mockUsePeriodReport.mockReturnValue({
        data: samplePeriodReport,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof usePeriodReport>)

      renderWithProviders(<ReportsPage />)

      await userEvent.click(screen.getByTestId('period-row-acc-1'))

      await waitFor(() => {
        expect(screen.getByTestId('period-txns-acc-1')).toBeInTheDocument()
        expect(screen.getByText('JE-001')).toBeInTheDocument()
        expect(screen.getByText('2026-01-10')).toBeInTheDocument()
      })
    })

    it('collapses expanded row on second click', async () => {
      mockUsePeriodReport.mockReturnValue({
        data: samplePeriodReport,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof usePeriodReport>)

      renderWithProviders(<ReportsPage />)

      const row = screen.getByTestId('period-row-acc-1')
      await userEvent.click(row)
      await waitFor(() => screen.getByTestId('period-txns-acc-1'))
      await userEvent.click(row)

      await waitFor(() => {
        expect(screen.queryByText('JE-001')).not.toBeInTheDocument()
      })
    })
  })

  describe('Balance at Date tab (Tab 2)', () => {
    it('renders form controls', async () => {
      await renderOnTab('tab-balance-at-date')

      await waitFor(() => {
        expect(screen.getByTestId('balance-date')).toBeInTheDocument()
        expect(screen.getByTestId('run-balance-at-date-btn')).toBeInTheDocument()
      })
    })

    it('Run button is disabled when date is empty', async () => {
      await renderOnTab('tab-balance-at-date')

      await waitFor(() => {
        expect(screen.getByTestId('run-balance-at-date-btn')).toBeDisabled()
      })
    })

    it('shows loading state', async () => {
      mockUsePeriodReport.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      } as ReturnType<typeof usePeriodReport>)

      await renderOnTab('tab-balance-at-date')

      await waitFor(() => {
        expect(screen.getByText(/loading balances/i)).toBeInTheDocument()
      })
    })

    it('shows error state', async () => {
      mockUsePeriodReport.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('fail'),
      } as ReturnType<typeof usePeriodReport>)

      await renderOnTab('tab-balance-at-date')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('shows empty state when no data', async () => {
      mockUsePeriodReport.mockReturnValue({
        data: { fromDate: '2026-01-31', toDate: '2026-01-31', entries: [] },
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof usePeriodReport>)

      await renderOnTab('tab-balance-at-date')

      await waitFor(() => {
        expect(screen.getByText(/no accounts found for the selected date/i)).toBeInTheDocument()
      })
    })

    it('renders balance at date table with correct columns', async () => {
      mockUsePeriodReport.mockReturnValue({
        data: samplePeriodReport,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof usePeriodReport>)

      await renderOnTab('tab-balance-at-date')

      await waitFor(() => {
        expect(screen.getByTestId('balance-at-date-table')).toBeInTheDocument()
        expect(screen.getByText('Balance')).toBeInTheDocument()
      })
    })

    it('renders balance rows using closingBalance', async () => {
      mockUsePeriodReport.mockReturnValue({
        data: samplePeriodReport,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof usePeriodReport>)

      await renderOnTab('tab-balance-at-date')

      await waitFor(() => {
        expect(screen.getByTestId('balance-row-acc-1')).toBeInTheDocument()
        expect(screen.getByTestId('balance-row-acc-2')).toBeInTheDocument()
      })
    })
  })

  describe('Balance at Level tab (Tab 3)', () => {
    it('renders form controls', async () => {
      await renderOnTab('tab-balance-at-level')

      await waitFor(() => {
        expect(screen.getByTestId('level-date')).toBeInTheDocument()
        expect(screen.getByTestId('level-input')).toBeInTheDocument()
        expect(screen.getByTestId('run-balance-at-level-btn')).toBeInTheDocument()
      })
    })

    it('Run button is disabled when inputs are empty', async () => {
      await renderOnTab('tab-balance-at-level')

      await waitFor(() => {
        expect(screen.getByTestId('run-balance-at-level-btn')).toBeDisabled()
      })
    })

    it('shows loading state', async () => {
      mockUseBalanceAtLevel.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      } as ReturnType<typeof useBalanceAtLevel>)

      await renderOnTab('tab-balance-at-level')

      await waitFor(() => {
        expect(screen.getByText(/loading balances/i)).toBeInTheDocument()
      })
    })

    it('shows error state', async () => {
      mockUseBalanceAtLevel.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('fail'),
      } as ReturnType<typeof useBalanceAtLevel>)

      await renderOnTab('tab-balance-at-level')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('shows empty state when no data', async () => {
      mockUseBalanceAtLevel.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useBalanceAtLevel>)

      await renderOnTab('tab-balance-at-level')

      await waitFor(() => {
        expect(screen.getByText(/no accounts found at the selected level/i)).toBeInTheDocument()
      })
    })

    it('renders balance at level table with correct columns', async () => {
      mockUseBalanceAtLevel.mockReturnValue({
        data: sampleBalanceAtLevel,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useBalanceAtLevel>)

      await renderOnTab('tab-balance-at-level')

      await waitFor(() => {
        expect(screen.getByTestId('balance-at-level-table')).toBeInTheDocument()
        expect(screen.getByText('Initial Balance')).toBeInTheDocument()
        expect(screen.getByText('Running Balance')).toBeInTheDocument()
        expect(screen.getByText('Total Balance')).toBeInTheDocument()
      })
    })

    it('renders balance at level rows', async () => {
      mockUseBalanceAtLevel.mockReturnValue({
        data: sampleBalanceAtLevel,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useBalanceAtLevel>)

      await renderOnTab('tab-balance-at-level')

      await waitFor(() => {
        expect(screen.getByTestId('level-row-acc-3')).toBeInTheDocument()
        expect(screen.getByText('Cash')).toBeInTheDocument()
        expect(screen.getByText('110')).toBeInTheDocument()
      })
    })
  })

  describe('Closure Simulation', () => {
    it('renders simulate closure toggle', () => {
      renderWithProviders(<ReportsPage />)

      expect(screen.getByTestId('simulate-closure-toggle')).toBeInTheDocument()
    })

    it('toggle is unchecked by default', () => {
      renderWithProviders(<ReportsPage />)

      const toggle = screen.getByTestId('simulate-closure-toggle').querySelector('input[type="checkbox"]')
      expect(toggle).not.toBeChecked()
    })

    it('does not show simulation banner when toggle is off', () => {
      renderWithProviders(<ReportsPage />)

      expect(screen.queryByTestId('simulation-active-banner')).not.toBeInTheDocument()
    })

    it('shows simulation banner when toggle is on', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ReportsPage />)

      const toggle = screen.getByTestId('simulate-closure-toggle').querySelector('input[type="checkbox"]')!
      await user.click(toggle)

      expect(screen.getByTestId('simulation-active-banner')).toBeInTheDocument()
      expect(screen.getByText(/closure simulation is active/i)).toBeInTheDocument()
    })

    it('calls usePeriodReport with simulateClosure=true when toggle is enabled', async () => {
      const user = userEvent.setup()
      mockUsePeriodReport.mockReturnValue({
        data: samplePeriodReport,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof usePeriodReport>)

      renderWithProviders(<ReportsPage />)

      // Set dates and run report
      await user.type(screen.getByTestId('period-from-date'), '2026-01-01')
      await user.type(screen.getByTestId('period-to-date'), '2026-01-31')
      await user.click(screen.getByTestId('run-period-report-btn'))

      // Enable simulation toggle
      const toggle = screen.getByTestId('simulate-closure-toggle').querySelector('input[type="checkbox"]')!
      await user.click(toggle)

      // Wait for re-fetch with simulateClosure=true
      await waitFor(() => {
        const calls = mockUsePeriodReport.mock.calls
        expect(calls[calls.length - 1][4]).toBe(true) // simulateClosure parameter (5th arg, index 4)
      })
    })

    it('calls useBalanceAtLevel with simulateClosure=true on balance at level tab', async () => {
      const user = userEvent.setup()
      mockUseBalanceAtLevel.mockReturnValue({
        data: sampleBalanceAtLevel,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useBalanceAtLevel>)

      await renderOnTab('tab-balance-at-level')

      // Set inputs and run
      await user.type(screen.getByTestId('level-date'), '2026-01-31')
      await user.type(screen.getByTestId('level-input'), '2')
      await user.click(screen.getByTestId('run-balance-at-level-btn'))

      // Enable toggle
      const toggle = screen.getByTestId('simulate-closure-toggle').querySelector('input[type="checkbox"]')!
      await user.click(toggle)

      await waitFor(() => {
        const calls = mockUseBalanceAtLevel.mock.calls
        expect(calls[calls.length - 1][3]).toBe(true) // simulateClosure parameter (4th arg, index 3)
      })
    })
  })
})
