import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { AccountPicker, type AccountPickerOption } from './AccountPicker'

// ─── Mock useAccounts ─────────────────────────────────────────────────────────

vi.mock('@/hooks/api/useAccounts', () => ({
  useAccounts: vi.fn(),
}))

import { useAccounts } from '@/hooks/api/useAccounts'

const mockUseAccounts = vi.mocked(useAccounts)

const sampleAccounts = [
  { id: 'acc-1', code: '100', name: 'Assets', level: 1, parentId: null, hasThirdParties: false, balance: 0, hasChildren: true },
  { id: 'acc-2', code: '1001', name: 'Cash', level: 2, parentId: 'acc-1', hasThirdParties: false, balance: 0, hasChildren: false },
  { id: 'acc-3', code: '1002', name: 'Bank', level: 2, parentId: 'acc-1', hasThirdParties: false, balance: 0, hasChildren: false },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAccounts.mockReturnValue({
    data: sampleAccounts,
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useAccounts>)
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AccountPicker', () => {
  it('renders without crashing when no accounts', () => {
    mockUseAccounts.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccounts>)

    renderWithProviders(
      <AccountPicker tenantId="t1" value={null} onChange={vi.fn()} label="Parent Account (optional)" />,
    )

    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows options with "CODE — Name" format', async () => {
    renderWithProviders(
      <AccountPicker tenantId="t1" value={null} onChange={vi.fn()} label="Parent Account (optional)" />,
    )

    await userEvent.click(screen.getByRole('combobox'))

    await waitFor(() => {
      expect(screen.getByText('100 — Assets')).toBeInTheDocument()
      expect(screen.getByText('1001 — Cash')).toBeInTheDocument()
    })
  })

  it('filters by typed code (partial match)', async () => {
    renderWithProviders(
      <AccountPicker tenantId="t1" value={null} onChange={vi.fn()} label="Parent Account (optional)" />,
    )

    await userEvent.type(screen.getByRole('combobox'), '100')

    await waitFor(() => {
      expect(screen.getByText('100 — Assets')).toBeInTheDocument()
      expect(screen.getByText('1001 — Cash')).toBeInTheDocument()
      expect(screen.getByText('1002 — Bank')).toBeInTheDocument()
    })
  })

  it('filters by typed name (partial match)', async () => {
    renderWithProviders(
      <AccountPicker tenantId="t1" value={null} onChange={vi.fn()} label="Parent Account (optional)" />,
    )

    await userEvent.type(screen.getByRole('combobox'), 'ash')

    await waitFor(() => {
      expect(screen.getByText('1001 — Cash')).toBeInTheDocument()
      // 'Assets' contains 'as' but not 'ash'; 'Bank' does not contain 'ash'
      expect(screen.queryByText('1002 — Bank')).not.toBeInTheDocument()
    })
  })

  it('calls onChange with the selected option', async () => {
    const handleChange = vi.fn()

    renderWithProviders(
      <AccountPicker tenantId="t1" value={null} onChange={handleChange} label="Parent Account (optional)" />,
    )

    await userEvent.click(screen.getByRole('combobox'))
    await waitFor(() => screen.getByText('1001 — Cash'))
    await userEvent.click(screen.getByText('1001 — Cash'))

    expect(handleChange).toHaveBeenCalledWith<[AccountPickerOption]>({
      id: 'acc-2',
      code: '1001',
      name: 'Cash',
    })
  })

  it('calls onChange(null) when cleared', async () => {
    const handleChange = vi.fn()
    const selectedOption: AccountPickerOption = { id: 'acc-2', code: '1001', name: 'Cash' }

    renderWithProviders(
      <AccountPicker
        tenantId="t1"
        value={selectedOption}
        onChange={handleChange}
        label="Parent Account (optional)"
      />,
    )

    // Clear button appears when there is a value
    const clearBtn = screen.getByTitle('Clear')
    await userEvent.click(clearBtn)

    expect(handleChange).toHaveBeenCalledWith(null)
  })

  it('excludes the account matching excludeAccountId', async () => {
    renderWithProviders(
      <AccountPicker
        tenantId="t1"
        value={null}
        onChange={vi.fn()}
        label="Parent Account (optional)"
        excludeAccountId="acc-1"
      />,
    )

    await userEvent.click(screen.getByRole('combobox'))

    await waitFor(() => {
      // acc-1 excluded
      expect(screen.queryByText('100 — Assets')).not.toBeInTheDocument()
      // others still visible
      expect(screen.getByText('1001 — Cash')).toBeInTheDocument()
    })
  })
})
